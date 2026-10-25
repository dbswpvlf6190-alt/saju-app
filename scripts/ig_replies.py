"""인스타그램 댓글 자동 풀이 답글(2026-10-23~, 인스타 유입 진단 '고칠 것 A·C').

진단: 게시물 71개에 댓글 2개·공유 0 — 볼 것만 있고 참여할 이유가 없었다. Threads에서 통한 "생일 남기면 풀어드림"을 인스타에도:
최근 4일 게시물(참여형 글·릴스·카드뉴스 모두)의 새 댓글에서 생년월일을 읽어 일간·내년 기운·시기를 계산하고(threads_replies와 같은
계산·금지어 검사), 존댓말 풀이 답글을 단다. 생일이 없으면 "생년월일을 남겨 주시면 풀어드려요" 한 줄.

  python scripts/ig_replies.py            # 최근 게시물 새 댓글에 답글 게시
  python scripts/ig_replies.py --dry-run  # 초안만 출력

작업 스케줄러: SajuIgReplies 10:15·19:50·21:15·22:45(반복 트리거 금지). 게시물마다 git 락(노트북·데스크톱 동시 실행 대비).
답한 기록: scripts/posted_state/ig_replies/<media_id>.json (git 추적).
"""
import argparse
import json
import os
import random
import sys
import time
from datetime import datetime, timezone

import requests

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import git_sync  # noqa: E402
import instagram_upload  # noqa: E402
import notify  # noqa: E402
import threads_replies as tr  # noqa: E402
from refill_queue import call_claude_raw  # noqa: E402

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE_DIR = os.path.join(BASE_DIR, "scripts", "posted_state", "ig_replies")
READING_DIR = os.path.join(BASE_DIR, "scripts", "posted_state", "ig_reading")
API = "https://graph.instagram.com/v21.0"
OWN_USERNAME = "sajulab_official"
MAX_AGE_HOURS = 96
GAP = (25, 50)  # 몰아서 달면 스팸으로 볼 수 있어 간격을 둔다

EXTRACT_PROMPT = tr.EXTRACT_PROMPT.replace("Threads 답글", "인스타그램 댓글").replace("답글", "댓글")

# Threads 프롬프트(계산값만 쓰기·금지어·시기 규칙)를 그대로 쓰되, 인스타는 존댓말·짧게.
WRITE_PROMPT = (
    tr.WRITE_PROMPT.replace("'사주랩' Threads 계정 담당자야. '생일 적어주면 사주 타입 알려줄게' 글에 달린 답글마다 풀이 답글을 쓴다.",
                            "'사주랩' 인스타그램 계정 담당자야. 게시물에 달린 댓글마다 풀이 대댓글을 쓴다.")
    .replace("첫 문장은 \"[유형](일간 이름) 일간이야\"로 유형을 알려준다(예: \"이슬비형(계수) 일간이야.\")",
             "첫 문장은 \"[일간 이름] 일간이세요\"로 알려준다(예: \"계수 일간이세요.\")")
    .split("- 말투:")[0]
    + "- 말투: 존댓말(~세요, ~예요, ~드려요). 반말 금지. 인스타 댓글이라 짧게 — 전체 250자 이내, 이모지 0~1개, 해시태그 금지.\n"
    + "- 생일이 없는 댓글(people 비어 있음)은 \"생년월일(양력/음력)을 댓글로 남겨 주시면 풀어드릴게요 🙏\" 한 문장. 칭찬·인사만 있으면 짧게 감사 인사.\n"
    + "- 마무리 한 문장은 \"더 자세한 풀이는 프로필 링크에 있어요\" 정도로 가볍게(가격·할인·링크 주소 금지).\n"
    + "- 답글 text 안에서는 큰따옴표(\")를 절대 쓰지 말고 필요하면 작은따옴표(')만 쓴다(JSON이 깨진다). 줄바꿈은 \\n으로만.\n"
    + "출력: {\"replies\":[{\"id\":\"...\",\"text\":\"...\"}, ...]} JSON만."
)


def _state_path(media_id):
    return os.path.join(STATE_DIR, f"{media_id}.json")


def load_state(media_id):
    try:
        with open(_state_path(media_id), "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {"media_id": media_id, "answered": {}}


def save_state(state):
    os.makedirs(STATE_DIR, exist_ok=True)
    with open(_state_path(state["media_id"]), "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def promises():
    """참여형 글(ig_reading_post.py 기록)은 약속한 주제(예: '2027년 운세')로 답한다."""
    out = {}
    if os.path.isdir(READING_DIR):
        for name in os.listdir(READING_DIR):
            if name.endswith(".json"):
                try:
                    with open(os.path.join(READING_DIR, name), "r", encoding="utf-8") as f:
                        rec = json.load(f)
                    out[str(rec["media_id"])] = rec.get("promise")
                except (OSError, ValueError, KeyError):
                    continue
    return out


def recent_media(tok):
    r = requests.get(f"{API}/{tok['user_id']}/media", params={"fields": "id,timestamp,comments_count,media_type", "limit": 12,
                                                              "access_token": tok["access_token"]}, timeout=30)
    r.raise_for_status()
    now = datetime.now(timezone.utc)
    out = []
    for m in r.json().get("data", []):
        ts = datetime.strptime(m["timestamp"], "%Y-%m-%dT%H:%M:%S%z")
        if (now - ts).total_seconds() / 3600 <= MAX_AGE_HOURS and m.get("comments_count"):
            out.append(m)
    return out


def comments(tok, media_id):
    r = requests.get(f"{API}/{media_id}/comments", params={"fields": "id,text,username,timestamp,replies{id,username}", "limit": 50,
                                                           "access_token": tok["access_token"]}, timeout=30)
    r.raise_for_status()
    return r.json().get("data", [])


def reply(tok, comment_id, text):
    r = requests.post(f"{API}/{comment_id}/replies", data={"message": text, "access_token": tok["access_token"]}, timeout=30)
    if r.status_code != 200:
        raise RuntimeError(f"{r.status_code} {r.text[:200]}")
    return r.json().get("id")


def draft(new, promise):
    extracted = {}
    res = call_claude_raw(EXTRACT_PROMPT, json.dumps([{"id": c["id"], "text": c.get("text", "")} for c in new], ensure_ascii=False))
    extracted.update({it["id"]: it for it in res["items"]})
    flat = [{"key": f"{c['id']}#{i}", **p} for c in new for i, p in enumerate(extracted.get(c["id"], {}).get("people", []))]
    computed = {x["key"]: x for x in tr.compute_ilgan(flat)} if flat else {}
    cases = []
    for c in new:
        ex = extracted.get(c["id"], {"people": [], "topic": "성격", "question": None})
        people = []
        for i, p in enumerate(ex.get("people", [])):
            x = computed.get(f"{c['id']}#{i}", {})
            if not x or "error" in x:
                continue
            person = {k: x.get(k) for k in ("date", "lunar", "gender", "typeName", "hangul", "dayGan", "metaphor", "keywords", "summary", "love", "work", "money", "relations", "timing")}
            topic = ex.get("topic")
            if promise and (not topic or topic == "성격"):
                topic = promise
            person["timing_pick"] = tr.pick_timing(person, topic)
            people.append(person)
        item = {"id": c["id"], "original": c.get("text", ""), "topic": ex.get("topic"), "question": ex.get("question"), "people": people}
        if promise:
            item["post_promise"] = promise
        cases.append(item)
    res = call_claude_raw(WRITE_PROMPT, json.dumps(cases, ensure_ascii=False))
    texts = {x["id"]: x["text"].strip() for x in res["replies"]}
    drafts = []
    for c in cases:
        text = tr.strip_name(texts.get(c["id"], ""))
        problems = tr.validate(text) if text else ["초안 없음"]
        if len(text) > 400:
            problems.append(f"길이 {len(text)}자")
        drafts.append({"id": c["id"], "original": c["original"], "text": text, "problems": problems})
    return drafts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    git_sync.git_pull(BASE_DIR)
    tok = instagram_upload.get_token()
    proms = promises()
    total = 0
    for m in recent_media(tok):
        mid = str(m["id"])
        lock_rel = os.path.relpath(os.path.join(STATE_DIR, f"{mid}.lock"), BASE_DIR)
        if not args.dry_run:
            ok, holder = git_sync.try_acquire_lock(BASE_DIR, lock_rel)
            if not ok:
                print(f"{mid}: 다른 컴퓨터({holder})가 처리 중")
                continue
        try:
            state = load_state(mid)
            new = [c for c in comments(tok, mid)
                   if c.get("username") != OWN_USERNAME and c["id"] not in state["answered"]
                   and not any(r.get("username") == OWN_USERNAME for r in (c.get("replies") or {}).get("data", []))]
            if not new:
                continue
            print(f"== {mid} ({m.get('media_type')}) 새 댓글 {len(new)}개, 약속 주제: {proms.get(mid)}")
            drafts = draft(new, proms.get(mid))
            sent = 0
            for n, d in enumerate(drafts, 1):
                print(f"  [{n}] {d['original'][:40]!r} → {d['text'][:80]!r} {d['problems'] or ''}")
                if args.dry_run or d["problems"]:
                    continue
                try:
                    state["answered"][d["id"]] = reply(tok, d["id"], d["text"])
                    sent += 1
                    save_state(state)
                except Exception as e:
                    print(f"    실패: {e}")
                    if "spam" in str(e).lower() or "limit" in str(e).lower():
                        break
                if n < len(drafts):
                    time.sleep(random.uniform(*GAP))
            if sent:
                total += sent
                git_sync.git_commit_push(BASE_DIR, [os.path.relpath(_state_path(mid), BASE_DIR)], f"instagram: 댓글 풀이 답글 {sent}개")
            bad = sum(1 for d in drafts if d["problems"])
            if bad and not args.dry_run:
                notify.notify("📝 인스타 답글 확인 필요", f"검사에 걸린 초안 {bad}개 — Claude에게 '인스타 답글 확인해'", tags=["memo"])
        finally:
            if not args.dry_run:
                git_sync.release_lock(BASE_DIR, lock_rel)
    if total:
        notify.notify("✅ 인스타 댓글 풀이 답글", f"{total}개 게시", tags=["white_check_mark"])
    print(f"완료: 답글 {total}개")


if __name__ == "__main__":
    main()
