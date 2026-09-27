"""Threads "무료 풀이" 글의 답글에 풀이 답글 달기 (반자동).

  python scripts/threads_replies.py draft MEDIA_ID   # 새 답글 읽기 → 생일 해석 → 일간 계산 → 풀이 초안
  python scripts/threads_replies.py show MEDIA_ID    # 초안 보기
  python scripts/threads_replies.py send MEDIA_ID    # 초안을 실제 답글로 게시(승인 후에만!)
  python scripts/threads_replies.py auto             # 최근 4일 무료 풀이 글 draft → 검사 통과분 자동 send
                                                     (작업 스케줄러 SajuThreadsReplyDraft 매일 10:00·23:30)
9/27 사용자가 첫 46개 품질을 확인한 뒤 auto는 검사(금지어·길이·링크) 통과분을 바로 게시하도록 바꿨다.
검사에 걸린 초안만 남겨 ntfy로 알리고, show/send로 사람이 처리한다.

흐름: ① Claude가 각 답글에서 생년월일·양/음력·궁금한 주제를 뽑고 ② 일간은 앱과 같은 계산
(scripts/threads_ilgan.mjs, lunar-typescript)으로 정확히 구하고 ③ 그 일간의 ilganPages 내용을 근거로
Claude가 2~3문장 풀이를 쓴다. 명리 계산을 AI에게 맡기지 않는 게 핵심(틀린 일간이 나가면 신뢰가 깨짐).

초안(남의 생일이 들어 있음)은 저장소가 아닌 로컬 ~/SajuAutoRender/threads_drafts/ 에 두고,
git에는 "어느 답글에 답했는지"(id만)를 scripts/posted_state/threads_replies/ 에 남겨 두 컴퓨터가 공유한다.
"""
import json
import os
import random
import re
import subprocess
import sys
import time

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import git_sync  # noqa: E402
import notify  # noqa: E402
import threads_api  # noqa: E402
from refill_queue import call_claude_raw  # noqa: E402

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE_DIR = os.path.join(BASE_DIR, "scripts", "posted_state", "threads_replies")
RENDER_ROOT = os.environ.get("SAJU_RENDER_DIR", os.path.join(os.path.expanduser("~"), "SajuAutoRender"))
DRAFT_DIR = os.path.join(RENDER_ROOT, "threads_drafts")
SITE = "saju-app-three-dusky.vercel.app"

BANNED = ["임신이 될", "임신 시기", "아이가 생길", "완치", "무조건", "반드시", "100%", "확실히", "틀림없", "당첨될", "당첨돼", "합격합니다", "합격해요", "떨어져요", "떨어집니다", "평생", "절대"]
MAX_LEN = 330

EXTRACT_PROMPT = """너는 Threads 답글에서 생년월일 정보를 뽑는 파서야. 각 답글마다 JSON 객체 하나를 돌려줘.
- people: 답글에 적힌 사람별 [{"date":"YYYY-MM-DD","lunar":true/false,"gender":"남/여/null"}]. 날짜가 두 개면 두 명(보통 본인+상대).
  · 두 자리 연도는 00~26이면 2000년대, 그 외는 1900년대. "801216" = 1980-12-16, "78 0826" = 1978-08-26.
  · "음", "음력"이 있으면 lunar=true, 없거나 "양"이면 false. 시간(오후4시, 17:20, 0.53 등)은 무시.
  · 날짜를 확실히 알 수 없으면 people=[].
- topic: 궁금한 것을 짧게(예: "돈", "연애", "일", "재회", "결혼운", "취업", "합격운", "성격"). 없으면 "성격".
- question: 구체적인 질문 문장이 있으면 그대로 요약(없으면 null).
출력: {"items":[{"id":"...","people":[...],"topic":"...","question":...}, ...]} JSON만."""

WRITE_PROMPT = f"""너는 무료 사주 서비스 '사주랩' Threads 계정 담당자야. '생일 적어주면 사주 타입 알려줄게' 글에 달린 답글마다 풀이 답글을 쓴다.
규칙:
- 각 사람의 일간·유형은 주어진 값만 쓴다(직접 계산하거나 바꾸지 말 것). 첫 문장은 "[유형](일간 이름) 일간이에요"로 유형을 알려준다(예: "이슬비형(계수) 일간이에요."). 답글은 그 사람 글 밑에 달리므로 아이디·이름을 부르지 말고, 아이디로 별명을 지어내지도 말 것.
- 그다음 1~2문장: 물어본 주제(topic/question)에 맞춰 주어진 ilgan 내용(love/work/money/relations/summary)에서 핵심만 쉬운 말로. 문장을 그대로 복사하지 말고 그 사람 질문에 답하듯 다듬는다.
- 두 사람이 있으면 두 사람 유형을 모두 말하고, 둘이 어떤 식으로 맞물리는지 한 문장 + "둘 궁합은 프로필 링크의 궁합 보기에서 자세히 볼 수 있어요" 식으로.
- 재회·로또·합격 여부·"운이 열리나요" 같은 예/아니오 질문엔 단정하지 말고, 그 유형이 그런 시기에 잘 풀리는 방식/태도를 말해준다.
- 금지: 무조건, 반드시, 100%, 확실히, 절대, 평생, 당첨·합격·불합격 단정, 공포 조장, 건강·의료 판단.
- 임신·출산·질병·수술 같은 건강 질문은 시기나 결과를 말하지 말 것("좋은 흐름이 온다"도 금지). 두 사람 성향과 서로를 챙기는 방식만 이야기하고, 건강 관련은 전문가와 상담하시라고 한 문장 덧붙인다.
- 마지막 문장은 다음 단계 안내. 물어본 주제에 맞춰 자연스럽게: 연애·재회·결혼·두 사람이면 "둘 궁합은 프로필 링크의 궁합 보기에서", 돈·일·취업이면 "재물운/직업운만 골라서 자세히 볼 수도 있어요(프로필 링크)", 그 외엔 자세한 풀이 안내. 답글마다 표현을 조금씩 다르게(예: "더 자세한 풀이는 프로필 링크에서 30초면 무료로 볼 수 있어요 🔮", "프로필 링크 들어가면 오행 비율까지 무료로 나와요", "내 사주 전체 풀이는 프로필 링크에서 무료로 확인해보세요 🍀"). 링크 주소는 쓰지 않는다.
- 말투: 다정한 존댓말(~예요, ~해요). 이모지는 0~2개. 전체 {MAX_LEN}자 이내. 해시태그 금지.
- 생일이 없는 답글(people 비어 있음)은 "생년월일(양력/음력)을 답글로 남겨주시면 풀어드릴게요 🙏" 한 문장. DM 얘기면 "DM은 확인이 어려워서요, 답글로 남겨주시면 바로 풀어드릴게요 🙏".
출력: {{"replies":[{{"id":"...","text":"..."}}, ...]}} JSON만."""


def _state_path(media_id):
    return os.path.join(STATE_DIR, f"{media_id}.json")


def _draft_path(media_id):
    return os.path.join(DRAFT_DIR, f"{media_id}.json")


def load_state(media_id):
    try:
        with open(_state_path(media_id), "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return {"media_id": media_id, "answered": {}}


def save_state(state):
    os.makedirs(STATE_DIR, exist_ok=True)
    with open(_state_path(state["media_id"]), "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def compute_ilgan(people):
    node_input = json.dumps([{"key": p.get("key"), "date": p["date"], "lunar": bool(p.get("lunar")), "gender": p.get("gender")} for p in people])
    out = subprocess.run(
        ["node", "--no-warnings", os.path.join(BASE_DIR, "scripts", "threads_ilgan.mjs"), "--batch"],
        input=node_input, capture_output=True, text=True, encoding="utf-8", cwd=BASE_DIR, timeout=60,
    )
    if out.returncode != 0:
        raise RuntimeError(f"일간 계산 실패: {out.stderr[-500:]}")
    return json.loads(out.stdout)


def strip_name(text):
    """모델이 그래도 아이디/지어낸 이름으로 시작하면("abc님은 ...") 그 부분만 뗀다."""
    return re.sub(r"^\S+님은\s+", "", text.strip(), count=1)


def validate(text):
    problems = [w for w in BANNED if w in text]
    if len(text) > MAX_LEN + 40:
        problems.append(f"길이 {len(text)}자")
    if "http" in text or SITE in text:
        problems.append("링크 포함")
    return problems


def draft(media_id):
    state = load_state(media_id)
    replies = [r for r in threads_api.get_replies(media_id) if not r.get("is_reply_owned_by_me")]
    new = [r for r in replies if r["id"] not in state["answered"] and not r.get("has_replies")]
    if not new:
        print("새로 답할 답글이 없습니다.")
        return []
    print(f"새 답글 {len(new)}개 — 생일 해석 중")
    extracted = {}
    for i in range(0, len(new), 25):
        chunk = new[i:i + 25]
        res = call_claude_raw(EXTRACT_PROMPT, json.dumps([{"id": r["id"], "text": r.get("text", "")} for r in chunk], ensure_ascii=False))
        extracted.update({it["id"]: it for it in res["items"]})

    flat = []
    for r in new:
        for idx, p in enumerate(extracted.get(r["id"], {}).get("people", [])):
            flat.append({"key": f"{r['id']}#{idx}", **p})
    computed = {c["key"]: c for c in compute_ilgan(flat)} if flat else {}

    cases = []
    for r in new:
        ex = extracted.get(r["id"], {"people": [], "topic": "성격", "question": None})
        people = []
        for idx, p in enumerate(ex.get("people", [])):
            c = computed.get(f"{r['id']}#{idx}", {})
            if "error" in c or not c:
                continue
            people.append({k: c.get(k) for k in ("date", "lunar", "gender", "typeName", "hangul", "dayGan", "metaphor", "keywords", "summary", "love", "work", "money", "relations")})
        cases.append({"id": r["id"], "username": r.get("username"), "original": r.get("text", ""), "topic": ex.get("topic"), "question": ex.get("question"), "people": people})

    drafts = []
    for i in range(0, len(cases), 12):
        chunk = cases[i:i + 12]
        payload = [{k: c[k] for k in ("id", "username", "original", "topic", "question", "people")} for c in chunk]
        res = call_claude_raw(WRITE_PROMPT, json.dumps(payload, ensure_ascii=False))
        texts = {x["id"]: x["text"].strip() for x in res["replies"]}
        for c in chunk:
            text = strip_name(texts.get(c["id"], ""))
            drafts.append({
                "id": c["id"], "username": c["username"], "original": c["original"],
                "types": [f"{p['typeName']}({p['hangul']}, {p['date']}{' 음' if p.get('lunar') else ''})" for p in c["people"]],
                "text": text, "problems": validate(text) if text else ["초안 없음"],
            })
    os.makedirs(DRAFT_DIR, exist_ok=True)
    with open(_draft_path(media_id), "w", encoding="utf-8") as f:
        json.dump(drafts, f, ensure_ascii=False, indent=2)
    bad = sum(1 for d in drafts if d["problems"])
    print(f"초안 {len(drafts)}개 저장: {_draft_path(media_id)} (검사 걸림 {bad}개)")
    if bad:
        notify.notify("📝 Threads 풀이 답글 확인 필요", f"검사에 걸린 초안 {bad}개 — Claude에게 'Threads 답글 확인해'", tags=["memo"])
    return drafts


def show(media_id):
    with open(_draft_path(media_id), "r", encoding="utf-8") as f:
        drafts = json.load(f)
    for i, d in enumerate(drafts, 1):
        flag = f"  ⚠️ {d['problems']}" if d["problems"] else ""
        print(f"[{i}] @{d['username']}: {d['original'].replace(chr(10), ' / ')}")
        print(f"    → {' + '.join(d['types']) or '(생일 없음)'}{flag}")
        print(f"    {d['text']}\n")


def send(media_id, gap=(40, 75)):
    with open(_draft_path(media_id), "r", encoding="utf-8") as f:
        drafts = json.load(f)
    state = load_state(media_id)
    todo = [d for d in drafts if d["id"] not in state["answered"] and d["text"] and not d["problems"]]
    print(f"게시할 답글 {len(todo)}개 (간격 {gap[0]}~{gap[1]}초 — 한꺼번에 몰아 올리면 스팸으로 볼 수 있음)")
    sent = 0
    for n, d in enumerate(todo, 1):
        try:
            state["answered"][d["id"]] = threads_api.reply(d["id"], d["text"])
            sent += 1
            save_state(state)
            print(f"  {n}/{len(todo)} @{d['username']} 완료")
        except Exception as e:
            print(f"  {n}/{len(todo)} @{d['username']} 실패: {e}")
            if "spam" in str(e).lower() or "limit" in str(e).lower():
                print("  제한 신호가 보여 중단합니다.")
                break
        if n < len(todo):
            time.sleep(random.uniform(*gap))
    git_sync.git_commit_push(BASE_DIR, [os.path.relpath(_state_path(media_id), BASE_DIR)], f"threads: 풀이 답글 {sent}개 게시")
    notify.notify("✅ Threads 풀이 답글 게시", f"{sent}/{len(todo)}개 완료", tags=["white_check_mark"])


def auto():
    """run_daily_threads.py가 남긴 kind=reading 기록 중 최근 4일 글의 새 답글을 초안으로 만든다. 게시는 안 함."""
    from datetime import datetime, timezone
    git_sync.git_pull(BASE_DIR)
    posted_dir = os.path.join(BASE_DIR, "scripts", "posted_state", "threads")
    for name in sorted(os.listdir(posted_dir)):
        if not name.endswith(".json"):
            continue
        with open(os.path.join(posted_dir, name), "r", encoding="utf-8") as f:
            rec = json.load(f)
        if rec.get("kind") != "reading":
            continue
        age_h = (datetime.now(timezone.utc) - datetime.fromisoformat(rec["posted_at"])).total_seconds() / 3600
        if age_h > 96:
            continue
        print(f"== {rec['id']} ({rec['media_id']}, {age_h:.0f}시간 전)")
        try:
            drafts = draft(rec["media_id"])
            if drafts:
                send(rec["media_id"])
        except Exception as e:
            print(f"  초안 실패: {e}")
            notify.notify("❌ Threads 풀이 초안 실패", f"{rec['id']}\n{notify.summarize_error(str(e))}", priority=4, tags=["warning"])


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "auto":
        auto()
        sys.exit(0)
    if len(sys.argv) != 3 or sys.argv[1] not in ("draft", "show", "send"):
        print(__doc__)
        sys.exit(1)
    {"draft": draft, "show": show, "send": send}[sys.argv[1]](sys.argv[2])
