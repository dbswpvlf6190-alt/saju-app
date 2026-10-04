"""Threads 대기열(threads_queue.json)이 줄면 Claude로 새 글을 써서 채운다(run_daily_threads.py가 호출).

원칙(docs/marketing/2026-exam-season-posts.md의 Threads 운영 원칙 + 9/26~27 실측):
- 본문엔 링크 없이, 링크는 내 댓글(comment)로. 짧게 쓰고 질문으로 끝내서 답글을 받는다.
- 반말·친근한 톤(설명형 공지보다 "골라봐/몇 개 해당돼?"가 반응이 좋았음). 단정·공포 표현 금지.
- 시험 시즌(exam_season.py 기간)엔 3개 중 1개는 수능·임용 소재.
- 성과(performance/latest.json의 threads)에서 조회가 높았던 글을 예시로 보여주고 비슷한 결로 쓰게 한다.
"""
import json
import os
import re
import sys
from datetime import date

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from refill_queue import call_claude_raw  # noqa: E402

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUEUE_PATH = os.path.join(BASE_DIR, "scripts", "threads_queue.json")
PERF_PATH = os.path.join(BASE_DIR, "scripts", "performance", "latest.json")
SITE = "https://saju-app-three-dusky.vercel.app"
LINKS = {
    "type": f"{SITE}/type-test?ref=threads",
    "compat": f"{SITE}/compatibility?ref=threads",
    "suneung": f"{SITE}/exam-luck?ref=threads",
    "imyong": f"{SITE}/exam-luck/imyong?ref=threads",
}
BANNED = ["해봤는데", "찾아봤는데", "놀랐음", "소름", "무조건", "반드시", "평생", "100%", "확실히", "틀림없", "절대", "합격한다", "합격해", "떨어진다", "떨어져", "망한다", "저주", "죽", "http"]
MAX_TEXT = 130

# 수능 2026-11-19, 초등 임용 1차 11/7, 중등 11/28(예정). 시험 8일 전까지만 새 시험 글을 만든다(exam_season.py와 같은 원칙).
EXAMS = [("suneung", date(2026, 11, 19)), ("imyong", date(2026, 11, 28))]

SYSTEM = """너는 무료 사주 서비스 '사주랩'의 Threads 계정 글을 쓰는 사람이야. 20~40대 한국 Threads 이용자가 스크롤을 멈추고 답글을 달게 만드는 짧은 글을 쓴다.
10/4 실측: 가장 잘 된 일반 글은 "첫인상이랑 실제 성격 완전 다르다는 말 자주 듣는 사람?"(조회 887, 85자) — 읽는 사람이 "나 얘기네" 하고 자기 얘기로 답글을 단다. 체크리스트·시험 소재·긴 설명은 조회 20~150으로 약했다.
형식(비중 순): ① "~하는 사람?" 자기 찾기(절반 이상) ② vs 비교 "너는 어느 쪽?" ③ 사주 유형 한 줄 묘사(10가지 유형: 리더나무형/유연풀잎형/태양형/촛불형/큰산형/기름진밭형/원석형/보석형/큰강형/이슬비형) + "너는 뭐야?".
규칙:
- 반말, 친근하게. 줄바꿈을 살려 2~5줄, 본문 100자 안팎(최대 120자). 마지막 줄은 한 단어·한 마디로 답할 수 있는 질문("너는 어느 쪽?", "이런 사람 손?", "네 유형 댓글로").
- 시험·수험생 소재는 쓰지 않는다(Threads 이용자 반응이 없었음).
- 본문에 링크·해시태그 금지. 이모지는 0~2개.
- 사주 해석은 "~로 보기도 해/~한 편" 정도로 부드럽게. 단정(무조건·반드시·평생·100%), 합격/불합격·재물 보장, 공포 조장, 건강 판단 금지.
- comment: 내 글에 다는 첫 댓글. 본문 질문에 대한 짧은 힌트 1문장 + "30초 무료로 👇" 같은 안내 1문장. 링크 주소는 쓰지 말 것(시스템이 붙임).
- link: "type"(유형/성격/돈/일 전반), "compat"(연애·궁합·두 사람), "suneung"(수능), "imyong"(임용) 중 하나.
- 이미 쓴 글의 첫 줄과 겹치지 않게 새로운 소재로.
- 계정은 '사주랩' 브랜드다. 이용자인 척하는 체험담·후기("해봤는데", "찾아봤는데 잘 맞아서 놀랐음", "소름")는 절대 쓰지 말 것(표시광고법상 뒷광고).
출력: {"posts":[{"text":"...","comment":"...","link":"type|compat|suneung|imyong","topic":"사주|수능응원"}]} JSON만."""


def load_queue():
    with open(QUEUE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def active_exams(today=None):
    # 10/4: Threads에선 시험 소재 반응이 없어(조회 22~149) 배정을 끈다. 인스타·사이트 시험 시즌은 exam_season.py가 그대로 담당.
    return []


def top_examples():
    try:
        with open(PERF_PATH, "r", encoding="utf-8") as f:
            items = json.load(f).get("threads", {}).get("items", [])
    except (OSError, json.JSONDecodeError):
        return []
    q = {x["id"]: x["text"] for x in load_queue()}
    scored = [(i.get("metrics", {}).get("views") or 0, q.get(i.get("id"), "")) for i in items if i.get("metrics")]
    return [t for v, t in sorted(scored, reverse=True)[:3] if t]


def validate(post):
    text, comment = post.get("text", ""), post.get("comment", "")
    problems = [w for w in BANNED if w in text or w in comment]
    if len(text) > MAX_TEXT:
        problems.append(f"길이 {len(text)}")
    if post.get("link") not in LINKS:
        problems.append("link 값")
    lines = text.strip().splitlines()
    if not lines or not any(k in lines[-1] for k in ("?", "댓글", "손")):
        problems.append("답글 부르는 질문으로 안 끝남")
    return problems


def refill(n=6):
    queue = load_queue()
    # 게시된 글도 대기열에 남아 있으므로(게시 여부는 posted_state로만 구분) 대기열 첫 줄만으로 중복을 막는다.
    existing_first = [x["text"].splitlines()[0] for x in queue]
    exams = active_exams()
    ask = {
        "count": n,
        "exam_share": "시험 소재 없이",
        "avoid_first_lines": existing_first[-40:],
        "good_examples": top_examples(),
    }
    res = call_claude_raw(SYSTEM, json.dumps(ask, ensure_ascii=False))
    nums = [int(m.group(1)) for x in queue if (m := re.match(r"T(\d+)$", x["id"]))]
    next_num = max(nums, default=0) + 1
    added = []
    for post in res.get("posts", []):
        problems = validate(post)
        first = post.get("text", "").splitlines()[0] if post.get("text") else ""
        if problems or first in existing_first:
            print(f"  탈락: {first[:30]} {problems}")
            continue
        link = post["link"]
        item = {
            "id": f"T{next_num:02d}",
            "topic": post.get("topic") or ("수능응원" if link in ("suneung", "imyong") else "사주"),
            "text": post["text"].strip(),
            "comment": f"{post['comment'].strip()}\n{LINKS[link]}",
            "exam": link if link in ("suneung", "imyong") else None,
            "generated": date.today().isoformat(),
        }
        queue.append(item)
        existing_first.append(first)
        added.append(item["id"])
        next_num += 1
    with open(QUEUE_PATH, "w", encoding="utf-8") as f:
        json.dump(queue, f, ensure_ascii=False, indent=2)
    print(f"Threads 대기열 +{len(added)}개: {added}")
    return added


if __name__ == "__main__":
    refill(int(sys.argv[1]) if len(sys.argv) > 1 else 6)
