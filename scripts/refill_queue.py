"""
릴스/카드뉴스 대기열이 부족해지면 Claude API로 새 콘텐츠를 자동 생성해서 채운다.
run_daily.py / run_daily_cardnews.py가 게시 직전에 ensure_buffer()를 호출해서,
남은 미게시 항목이 MIN_BUFFER 밑으로 떨어지면 TARGET_BUFFER까지 자동으로 채운다.

수동 실행: python scripts/refill_queue.py reel   (또는 cardnews, 둘 다 검사하려면 인자 없이 실행)
"""
import json
import os
import re
import subprocess
import sys

import requests
from dotenv import load_dotenv

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPTS_DIR)
load_dotenv(os.path.join(PROJECT_ROOT, ".env.local"))

MIN_BUFFER = 3
TARGET_BUFFER = 7

REEL_TEMPLATE_DIR = os.path.join(SCRIPTS_DIR, "reel-template")
CARDNEWS_TEMPLATE_DIR = os.path.join(SCRIPTS_DIR, "cardnews-template")
REELS_JSON = os.path.join(REEL_TEMPLATE_DIR, "reels.json")
CARDSETS_JSON = os.path.join(CARDNEWS_TEMPLATE_DIR, "cardsets.json")
REEL_MANIFEST = os.path.join(SCRIPTS_DIR, "reel_manifest.json")
CARDNEWS_MANIFEST = os.path.join(SCRIPTS_DIR, "cardnews_manifest.json")

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")

SYSTEM_PROMPT_REELS = """당신은 인스타그램 사주 콘텐츠 계정 '사주랩'의 릴스 대본을 쓰는 카피라이터입니다.
다음 원칙을 반드시 지키세요.

1. "반드시 ~하게 된다"처럼 단정하지 말고, "~한 편이에요", "~라는 해석이 있어요"처럼 가능성을 전하는 어조를 쓰세요.
2. 오행·십성 같은 명리학 개념을 언급하되, 전문 용어가 나오면 바로 쉬운 말로 풀어주세요.
3. caption/ctaLine/screenshotCaption에서 "무료로 확인 가능"이라고 연결지을 수 있는 건 오직
   이 4가지뿐입니다: 사주 여덟 글자, 오행 비율, 일간, 전반적 성향 해석. 이 4가지 이외의
   구체적 용어(십성 구성, 삼재 계산, 택일, 궁합 점수, 대운, 십신 분석 등)를 "무료로 확인
   가능"이라고 쓰면 실제로 없는 기능을 있다고 속이는 것이 됩니다 — 카드 본문에서 그 개념을
   설명하는 건 괜찮지만, 무료 확인 유도 문구에서는 반드시 위 4가지 표현으로만 마무리하세요.
4. 각 릴스는 다음 필드로 구성됩니다:
   - category: sangsik/jaemul/yeonae/jigeop/saengnyeon/ingan 중 하나 (영문 슬러그)
   - categoryLabel: 사주상식/재물운/연애운/직업운/생년월일 운세/인간관계 (category와 짝이 맞아야 함)
   - title: 짧은 제목
   - hook: 화면에 순서대로 뜨는 3~4개의 짧은 문장 조각 배열(조각당 5~12자 내외)
   - info: {"pre":"...","emphasis":"...","post":"...","sub":["...","..."]} — pre+emphasis+post가
     자연스럽게 이어지는 한 문장, sub는 보충 설명 1~2문장 배열
   - curiosity: 다음 화면이 궁금해지게 만드는 2줄(배열)
   - screenshotCaption: 앱 화면 스크린샷 위에 뜨는 한 줄 설명(무료 결과에 실제 있는 내용만)
   - caption: 인스타그램 게시물 캡션. 본문 1~2문장 + 빈 줄 + "팔로우하면 매일 새로운 사주 이야기
     올려드려요 🔔" + 빈 줄 + 해시태그 5~6개(#사주 #무료사주 필수 포함)
5. "이미 사용한 제목" 목록과 소재·후킹 방식이 겹치지 않게 하세요. 궁금증 유발형, 비교형,
   숫자 제시형, 경고·주의환기형, 직접 호소형을 번갈아 쓰세요 — 같은 톤을 반복하지 마세요.

요청받은 개수만큼 JSON 배열로만 응답하세요. 코드블록이나 설명 문장 없이 순수 JSON 배열만 출력하세요."""

SYSTEM_PROMPT_CARDNEWS = """당신은 인스타그램 사주 콘텐츠 계정 '사주랩'의 카드뉴스(캐러셀) 대본을 쓰는
카피라이터입니다. 다음 원칙을 반드시 지키세요.

1. "반드시 ~하게 된다"처럼 단정하지 말고, "~한 편이에요", "~라는 해석이 있어요"처럼 가능성을 전하는 어조를 쓰세요.
2. 오행·십성 같은 명리학 개념을 언급하되, 전문 용어가 나오면 바로 쉬운 말로 풀어주세요.
3. caption/ctaLine에서 "무료로 확인 가능"이라고 연결지을 수 있는 건 오직 이 4가지뿐입니다:
   사주 여덟 글자, 오행 비율, 일간, 전반적 성향 해석. 이 4가지 이외의 구체적 용어(십성 구성,
   삼재 계산, 택일, 궁합 점수, 대운, 십신 분석 등)를 "무료로 확인 가능"이라고 쓰면 실제로
   없는 기능을 있다고 속이는 것이 됩니다 — 카드 본문(items)에서 그 개념을 설명하는 건
   괜찮지만, 무료 확인 유도 문구에서는 반드시 위 4가지 표현으로만 마무리하세요.
4. 각 세트는 다음 필드로 구성됩니다:
   - category: 사주상식/재물운/연애운/직업운/생년월일/인간관계 중 하나 (한글)
   - title: 표지 제목
   - coverSub: 표지 부제
   - items: 3~5개, 각각 {"symbol":"한자 1글자","label":"짧은 이름","keyword":"핵심 키워드",
     "desc":"1~2문장 설명"}
   - ctaLine: 마지막 CTA 화면의 짧은 유도 문구
   - caption: 인스타그램 캡션. 본문 1~2문장(저장 유도, "📌" 포함) + 빈 줄 + 무료 확인 안내 +
     빈 줄 + "팔로우하면 매일 새로운 사주 이야기 올려드려요 🔔" + 빈 줄 + 해시태그 5~6개

5. "이미 사용한 제목" 목록과 소재가 겹치지 않게 새로운 각도를 다루세요.

요청받은 개수만큼 JSON 배열로만 응답하세요. 코드블록이나 설명 문장 없이 순수 JSON 배열만 출력하세요."""


def log(msg):
    print(f"[refill_queue] {msg}")


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def git(args):
    return subprocess.run(["git"] + args, cwd=PROJECT_ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")


def git_commit_push(paths, message):
    git(["add"] + paths)
    commit = git(["commit", "-m", message])
    if commit.returncode != 0:
        if "nothing to commit" in (commit.stdout + commit.stderr).lower():
            return True
        log(f"commit 실패: {commit.stderr[-500:]}")
        return False
    push = git(["push", "origin", "main"])
    if push.returncode != 0:
        log(f"push 실패(로컬엔 커밋됨, 다음 실행 때 재시도 필요): {push.stderr[-500:]}")
        return False
    return True


def call_claude(system_prompt, used_titles, count):
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY가 없어서 자동 채우기를 할 수 없습니다.")
    resp = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": "claude-sonnet-5",
            "max_tokens": 8000,
            # 이 작업은 정해진 형식의 JSON을 쓰는 것뿐이라 사고 과정이 필요 없다. Sonnet 5는
            # 기본적으로 적응형 사고가 켜져 있어서, 끄지 않으면 그 사고 토큰이 max_tokens
            # 예산을 먼저 다 써버려 실제 JSON 답변이 나오기 전에 잘리는 문제가 있었다.
            "thinking": {"type": "disabled"},
            "system": system_prompt,
            "messages": [
                {
                    "role": "user",
                    "content": f"이미 사용한 제목 목록: {json.dumps(used_titles, ensure_ascii=False)}\n\n"
                    f"위 목록과 겹치지 않게 새로운 소재로 {count}개 만들어줘.",
                }
            ],
        },
        timeout=120,
    )
    resp.raise_for_status()
    blocks = resp.json()["content"]
    text_block = next((b for b in blocks if b.get("type") == "text"), None)
    if text_block is None:
        raise RuntimeError(f"Claude 응답에 텍스트 블록이 없습니다: {blocks}")
    text = text_block["text"].strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
    return json.loads(text)


def next_id(existing_ids, prefix):
    nums = [int(i[len(prefix):]) for i in existing_ids if i.startswith(prefix) and i[len(prefix):].isdigit()]
    return max(nums, default=0) + 1


def ensure_reel_buffer(min_buffer=MIN_BUFFER, target_buffer=TARGET_BUFFER):
    manifest = load_json(REEL_MANIFEST)
    posted_dir = os.path.join(SCRIPTS_DIR, "posted_state", "reel")
    unposted = [e for e in manifest if not os.path.exists(os.path.join(posted_dir, f"{e['day']:02d}.json"))]
    if len(unposted) >= min_buffer:
        log(f"릴스 대기열 {len(unposted)}개 남음 (기준 {min_buffer}) — 안 채워도 됨")
        return

    need = target_buffer - len(unposted)
    log(f"릴스 대기열 {len(unposted)}개 남음 — {need}개 새로 생성")

    reels = load_json(REELS_JSON)
    used_titles = [r["title"] for r in reels]
    new_items = call_claude(SYSTEM_PROMPT_REELS, used_titles, need)

    next_num = next_id([r["id"] for r in reels], "R")
    next_order = max((r["order"] for r in reels), default=-1) + 1
    next_day = max((e["day"] for e in manifest), default=0) + 1

    new_ids = []
    for item in new_items:
        rid = f"R{next_num:02d}"
        entry = {
            "order": next_order,
            "id": rid,
            "category": item["category"],
            "categoryLabel": item["categoryLabel"],
            "title": item["title"],
            "hook": item["hook"],
            "info": item["info"],
            "curiosity": item["curiosity"],
            "screenshotCaption": item["screenshotCaption"],
        }
        reels.append(entry)
        manifest.append({
            "day": next_day,
            "id": rid,
            "category": item["categoryLabel"],
            "video": f"reels/{next_order:02d}_{rid}_{item['category']}.mp4",
            "remote_name": f"saju_{next_day:02d}_{rid}.mp4",
            "caption": item["caption"],
        })
        new_ids.append(rid)
        next_num += 1
        next_order += 1
        next_day += 1

    save_json(REELS_JSON, reels)
    log(f"reels.json에 {len(new_items)}개 추가: {new_ids}")

    for rid in new_ids:
        subprocess.run(["node", os.path.join(REEL_TEMPLATE_DIR, "build.mjs"), rid], cwd=PROJECT_ROOT, check=True)

    save_json(REEL_MANIFEST, manifest)

    ok = git_commit_push(
        ["scripts/reel-template/reels.json", "scripts/reel_manifest.json"] + [f"reels/{r['video'].split('/')[-1]}" for r in manifest[-len(new_ids):]],
        f"content: 릴스 {len(new_ids)}개 자동 생성 (대기열 소진 방지, {', '.join(new_ids)})",
    )
    log(f"git push {'성공' if ok else '실패'}")


def ensure_cardnews_buffer(min_buffer=MIN_BUFFER, target_buffer=TARGET_BUFFER):
    manifest = load_json(CARDNEWS_MANIFEST)
    posted_dir = os.path.join(SCRIPTS_DIR, "posted_state", "cardnews")
    unposted = [e for e in manifest if not os.path.exists(os.path.join(posted_dir, f"{e['day']:02d}.json"))]
    if len(unposted) >= min_buffer:
        log(f"카드뉴스 대기열 {len(unposted)}개 남음 (기준 {min_buffer}) — 안 채워도 됨")
        return

    need = target_buffer - len(unposted)
    log(f"카드뉴스 대기열 {len(unposted)}개 남음 — {need}개 새로 생성")

    cardsets = load_json(CARDSETS_JSON)
    used_titles = [c["title"] for c in cardsets]
    new_items = call_claude(SYSTEM_PROMPT_CARDNEWS, used_titles, need)

    next_num = next_id([c["id"] for c in cardsets], "C")
    next_order = max((c["order"] for c in cardsets), default=-1) + 1
    next_day = max((e["day"] for e in manifest), default=0) + 1

    new_ids = []
    for item in new_items:
        cid = f"C{next_num:02d}"
        entry = {
            "id": cid,
            "order": next_order,
            "category": item["category"],
            "title": item["title"],
            "coverSub": item["coverSub"],
            "items": item["items"],
            "ctaLine": item["ctaLine"],
            "caption": item["caption"],
        }
        cardsets.append(entry)
        dir_name = f"{next_order + 1:02d}_{cid}"
        manifest.append({
            "day": next_day,
            "id": cid,
            "category": item["category"],
            "dir": f"cardnews/{dir_name}",
            "remote_prefix": f"saju_cardnews_{dir_name}",
            "caption": item["caption"],
        })
        new_ids.append(cid)
        next_num += 1
        next_order += 1
        next_day += 1

    save_json(CARDSETS_JSON, cardsets)
    log(f"cardsets.json에 {len(new_items)}개 추가: {new_ids}")

    subprocess.run(["node", os.path.join(CARDNEWS_TEMPLATE_DIR, "build.mjs")], cwd=PROJECT_ROOT, check=True)

    save_json(CARDNEWS_MANIFEST, manifest)

    new_dirs = [f"cardnews/{m['dir'].split('/')[-1]}" for m in manifest[-len(new_ids):]]
    ok = git_commit_push(
        ["scripts/cardnews-template/cardsets.json", "scripts/cardnews_manifest.json"] + new_dirs,
        f"content: 카드뉴스 {len(new_ids)}개 자동 생성 (대기열 소진 방지, {', '.join(new_ids)})",
    )
    log(f"git push {'성공' if ok else '실패'}")


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "all"
    if target in ("reel", "all"):
        ensure_reel_buffer()
    if target in ("cardnews", "all"):
        ensure_cardnews_buffer()
