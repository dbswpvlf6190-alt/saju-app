"""해외판 Threads(@sajulab.jp / @sajulab.en) 답글에 풀이 답글 달기.

  python scripts/global_threads_replies.py --market ja draft MEDIA_ID   # 새 답글 → 초안(게시 안 함)
  python scripts/global_threads_replies.py --market ja show MEDIA_ID    # 초안 보기(한국어 역번역 포함)
  python scripts/global_threads_replies.py --market ja send MEDIA_ID    # 검사 통과 초안 게시
  python scripts/global_threads_replies.py --market ja auto             # 최근 4일 게시 글의 새 답글 → 초안 → (AUTO_SEND면) 게시

국내 threads_replies.py와 같은 원칙: 일간 계산은 threads_ilgan.mjs(사이트와 같은 lunar-typescript)로 하고 AI는 문장만 쓴다.
다른 점: ① 생일이 없어도 답한다(해외 첫 주 글은 '링크로 진단하고 타입을 리프로 알려줘' 형식이라 타입·감상 답글이 대부분)
② 답글 끝에 해외판 무료 결과 링크(/ja·/en, ref=th_{market}_reply)를 코드가 붙인다 ③ 초안마다 한국어 역번역을 남겨 사람이 확인할 수 있게 한다.
초안(남의 생일이 들어 있음)은 저장소가 아닌 ~/SajuAutoRender/threads_drafts_{market}/ 에, 어느 답글에 답했는지(id만)는
scripts/posted_state/threads_{market}_replies/ 에 남겨 두 컴퓨터가 공유한다.
"""
import argparse
import json
import os
import random
import re
import sys
import time
from datetime import datetime, timezone

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import git_sync  # noqa: E402
import notify  # noqa: E402
import threads_api  # noqa: E402
from refill_queue import call_claude_raw  # noqa: E402
from threads_replies import RENDER_ROOT, compute_ilgan  # noqa: E402

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = "https://saju-app-three-dusky.vercel.app"
# 첫 실행분은 사람이(Claude 대화에서) show로 확인한 뒤 send. 품질이 확인되면 True로 바꿔 국내처럼 검사 통과분을 바로 게시한다.
AUTO_SEND = False
MAX_PER_RUN = 20  # 새 계정이라 한 번에 너무 많이 달면 스팸으로 볼 수 있다
MAX_LEN = 500  # Threads 글자 한도(링크 포함)

# src/lib/global/dayMasters.ts의 label·image와 같은 표기(사이트 결과 화면과 답글이 같은 이름을 쓰도록).
DAY_MASTER_LABELS = {
    "甲": {"ja": "甲（きのえ）・まっすぐ伸びる大樹", "en": "Jia · Yang Wood (The Great Tree)"},
    "乙": {"ja": "乙（きのと）・風にしなる草花", "en": "Yi · Yin Wood (The Flowering Vine)"},
    "丙": {"ja": "丙（ひのえ）・空を照らす太陽", "en": "Bing · Yang Fire (The Sun)"},
    "丁": {"ja": "丁（ひのと）・夜を灯すろうそくの火", "en": "Ding · Yin Fire (The Candle Flame)"},
    "戊": {"ja": "戊（つちのえ）・どっしりとした山", "en": "Wu · Yang Earth (The Mountain)"},
    "己": {"ja": "己（つちのと）・作物を育てる畑の土", "en": "Ji · Yin Earth (The Fertile Field)"},
    "庚": {"ja": "庚（かのえ）・鍛えられた鋼", "en": "Geng · Yang Metal (The Steel Blade)"},
    "辛": {"ja": "辛（かのと）・磨かれた宝石", "en": "Xin · Yin Metal (The Jewel)"},
    "壬": {"ja": "壬（みずのえ）・海へ流れる大河", "en": "Ren · Yang Water (The Great River)"},
    "癸": {"ja": "癸（みずのと）・大地をうるおす雨", "en": "Gui · Yin Water (The Gentle Rain)"},
}

BANNED = {
    "ja": ["絶対", "必ず", "100%", "確実", "間違いなく", "一生", "病気", "死", "今だけ", "限定", "先着", "後悔"],
    "en": ["guarantee", "definitely", "100%", "for sure", "always will", "never will", "forever", "illness", "disease",
           "death", "only today", "limited", "last chance", "regret"],
}

EXTRACT_PROMPT = """You parse replies to a Threads post by a Korean Saju (Four Pillars) account. For each reply return one JSON object.
- people: birth dates written in the reply, one per person: [{"date":"YYYY-MM-DD","lunar":false}].
  · Accept any format: 1995/3/14, 1995年3月14日, March 14 1995, 14 Mar 1995, 3/14/1995 (US month-first if the reply is English
    and the first number is <=12; if both first numbers are <=12 and the language is not English, use year/month/day order).
  · Japanese eras: 昭和N年 = 1925+N, 平成N年 = 1988+N, 令和N年 = 2018+N. Two-digit years: 00-26 -> 2000s, else 1900s.
  · lunar=true only if the reply explicitly says lunar/旧暦. Ignore birth times.
  · If the year is missing or the date is ambiguous, do not guess: people=[] (a wrong Day Master breaks trust).
- mentioned_type: if the reply names a Day Master or result they got, give the matching stem (one character) using ONLY this table,
  else null. Element words alone (水/Water/Fire...) -> null.
  甲 = きのえ / 大樹 / Jia / Great Tree / Tree      乙 = きのと / 草花 / Yi / Vine / Flowering Vine
  丙 = ひのえ / 太陽 / Bing / Sun                    丁 = ひのと / 灯 / ろうそく / Ding / Candle
  戊 = つちのえ / 山 / Wu / Mountain                 己 = つちのと / 畑 / Ji / Field / Fertile Field
  庚 = かのえ / 鋼 / Geng / Steel / Steel Blade      辛 = かのと / 宝石 / Xin / Jewel / Gem
  壬 = みずのえ / 大河 / Ren / River / Great River   癸 = みずのと / 雨 / Gui / Rain / Gentle Rain
- intent: one of "birthday", "type_result", "question", "praise", "other".
- question: short summary of any concrete question (or null).
Output: {"items":[{"id":"...","people":[...],"mentioned_type":...,"intent":"...","question":...}, ...]} JSON only."""

WRITE_PROMPT = {
    "ja": """あなたは韓国の四柱推命サービス「サジュラボ」の日本語Threadsアカウント担当です。投稿についたリプ一件ずつに返信を書きます。
ルール:
- 日干は与えられた値（day_master_label）だけを使う。自分で計算したり変えたりしない。
- 生年月日がある人: 名前やIDは呼ばずに、1文目で「日干は壬（みずのえ）・海へ流れる大河タイプですね🌊」のようにday_master_labelを伝える。続けて、与えられた性格メモ（韓国語のsummary/love/work/relations）から、質問や投稿のテーマに合う内容を1〜2文、やさしい日本語で（直訳せず自然に）。
- タイプ名だけを書いてくれた人（mentioned_type）: そのタイプらしい一言（共感・あるある）を1〜2文。
- 生年月日もタイプもない人: 感想へのお礼＋「生年月日（年・月・日）をリプしてくれたら日干をお伝えします」を一言。
- 締めの1文: 「八字（4つの柱）と五行バランスは下のリンクから30秒・無料で見られます👇」のように、無料の診断ページへ自然に案内（毎回言い回しを変える。URLは書かない、コードが付ける）。
- 断定禁止: 絶対・必ず・100%・確実・一生。病気・不安をあおる表現、限定・先着などの煽り禁止。占いは傾向として「〜な傾向があります」「〜と読みます」。
- 口調: 親しみのあるです・ます調。絵文字0〜2個。ハッシュタグ禁止。全体で280文字以内。
- 返信本文に半角ダブルクオート(")を使わない。
- korean: 返信の自然な韓国語訳（運営者確認用）。
出力: {"replies":[{"id":"...","text":"...","korean":"..."}]} JSONのみ。""",
    "en": """You run the English Threads account of Saju Lab, a Korean Saju (Four Pillars) app. Write one reply for each comment.
Rules:
- Use only the given day_master_label. Never compute or change it yourself.
- If the person gave a birthday: open with their Day Master without calling their name, e.g. "Your Day Master is Ren · Yang Water (The Great River) 🌊". Then 1-2 sentences grounded in the given personality notes (Korean summary/love/work/relations), matched to their question or the post theme, in natural warm English (do not translate literally).
- If they only named a type they got (mentioned_type): 1-2 relatable, fun sentences about that type.
- If neither: thank them and invite them to reply with their birthday (YYYY/MM/DD) to learn their Day Master.
- Final sentence: casually point to the free page for their full chart (all 8 characters + 5-element balance, free, 30 sec) "below" — vary the wording every time. Never write a URL; code appends it.
- No absolute claims (guaranteed, definitely, 100%, forever), no fear, no health claims, no fake urgency (limited, last chance). Saju describes tendencies: "you tend to", "Saju reads this as".
- Tone: friendly, casual. 0-2 emojis. No hashtags. Max 280 characters.
- Never use the double-quote character (") inside text.
- korean: a natural Korean translation of the reply (for the operator to check).
Output: {"replies":[{"id":"...","text":"...","korean":"..."}]} JSON only.""",
}


def state_dir(market):
    return os.path.join(BASE_DIR, "scripts", "posted_state", f"threads_{market}_replies")


def draft_dir(market):
    return os.path.join(RENDER_ROOT, f"threads_drafts_{market}")


def load_state(market, media_id):
    try:
        with open(os.path.join(state_dir(market), f"{media_id}.json"), "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return {"media_id": media_id, "answered": {}}


def save_state(market, state):
    os.makedirs(state_dir(market), exist_ok=True)
    with open(os.path.join(state_dir(market), f"{state['media_id']}.json"), "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def validate(market, text):
    lower = text.lower()
    problems = [w for w in BANNED[market] if w.lower() in lower]
    if "http" in text:
        problems.append("링크 포함")
    if len(text) > 330:
        problems.append(f"길이 {len(text)}자")
    return problems


def stem_of(c):
    """threads_ilgan.mjs의 dayGan('임(壬)')에서 한자만."""
    m = re.search(r"\((.)\)", c.get("dayGan") or "")
    return m.group(1) if m else None


def draft(market, media_id, post_text=""):
    state = load_state(market, media_id)
    replies = [r for r in threads_api.get_replies(media_id) if not r.get("is_reply_owned_by_me")]
    new = [r for r in replies if r["id"] not in state["answered"] and not r.get("has_replies")][:MAX_PER_RUN]
    if not new:
        print("새로 답할 답글이 없습니다.")
        return []
    print(f"새 답글 {len(new)}개 — 해석 중")
    res = call_claude_raw(EXTRACT_PROMPT, json.dumps([{"id": r["id"], "text": r.get("text", "")} for r in new], ensure_ascii=False))
    extracted = {it["id"]: it for it in res["items"]}

    flat = [{"key": f"{r['id']}#{i}", **p} for r in new for i, p in enumerate(extracted.get(r["id"], {}).get("people", []))]
    computed = {c["key"]: c for c in compute_ilgan(flat)} if flat else {}

    cases = []
    for r in new:
        ex = extracted.get(r["id"], {})
        people = []
        for i, _ in enumerate(ex.get("people", [])):
            c = computed.get(f"{r['id']}#{i}", {})
            stem = stem_of(c)
            if not c or "error" in c or stem not in DAY_MASTER_LABELS:
                continue
            people.append({"day_master_label": DAY_MASTER_LABELS[stem][market], "summary": c.get("summary"), "love": c.get("love"),
                           "work": c.get("work"), "relations": c.get("relations")})
        mentioned = ex.get("mentioned_type")
        cases.append({
            "id": r["id"], "original": r.get("text", ""), "intent": ex.get("intent"), "question": ex.get("question"),
            "people": people[:1],  # 한 답글엔 한 사람만 푼다(해외판은 궁합 상품이 아직 없다)
            "mentioned_type": DAY_MASTER_LABELS[mentioned][market] if mentioned in DAY_MASTER_LABELS else None,
            "post_theme": post_text[:200],
        })

    res = call_claude_raw(WRITE_PROMPT[market], json.dumps(cases, ensure_ascii=False))
    written = {x["id"]: x for x in res["replies"]}
    link = f"{SITE}/{market}?ref=th_{market}_reply"
    drafts = []
    for c, r in zip(cases, new):
        w = written.get(c["id"], {})
        text = (w.get("text") or "").strip()
        problems = validate(market, text) if text else ["초안 없음"]
        full = f"{text}\n{link}" if text and not problems else text
        if len(full) > MAX_LEN:
            problems.append("링크 포함 500자 초과")
        drafts.append({"id": c["id"], "username": r.get("username"), "original": c["original"],
                       "types": [p["day_master_label"] for p in c["people"]] or ([c["mentioned_type"]] if c["mentioned_type"] else []),
                       "text": full, "korean": w.get("korean", ""), "problems": problems})
    os.makedirs(draft_dir(market), exist_ok=True)
    with open(os.path.join(draft_dir(market), f"{media_id}.json"), "w", encoding="utf-8") as f:
        json.dump(drafts, f, ensure_ascii=False, indent=2)
    bad = sum(1 for d in drafts if d["problems"])
    print(f"초안 {len(drafts)}개 저장 (검사 걸림 {bad}개)")
    return drafts


def show(market, media_id):
    with open(os.path.join(draft_dir(market), f"{media_id}.json"), "r", encoding="utf-8") as f:
        drafts = json.load(f)
    for i, d in enumerate(drafts, 1):
        flag = f"  ⚠️ {d['problems']}" if d["problems"] else ""
        print(f"[{i}] @{d['username']}: {d['original'].replace(chr(10), ' / ')}")
        print(f"    → {' / '.join(d['types']) or '(생일·타입 없음)'}{flag}")
        print(f"    {d['text']}\n    (한국어) {d['korean']}\n")


def send(market, media_id, gap=(45, 90)):
    with open(os.path.join(draft_dir(market), f"{media_id}.json"), "r", encoding="utf-8") as f:
        drafts = json.load(f)
    state = load_state(market, media_id)
    todo = [d for d in drafts if d["id"] not in state["answered"] and d["text"] and not d["problems"]]
    print(f"게시할 답글 {len(todo)}개 (간격 {gap[0]}~{gap[1]}초)")
    sent = 0
    for n, d in enumerate(todo, 1):
        try:
            state["answered"][d["id"]] = threads_api.reply(d["id"], d["text"])
            sent += 1
            save_state(market, state)
            print(f"  {n}/{len(todo)} @{d['username']} 완료")
        except Exception as e:
            print(f"  {n}/{len(todo)} @{d['username']} 실패: {e}")
            if "spam" in str(e).lower() or "limit" in str(e).lower():
                print("  제한 신호가 보여 중단합니다.")
                break
        if n < len(todo):
            time.sleep(random.uniform(*gap))
    rel = os.path.relpath(os.path.join(state_dir(market), f"{media_id}.json"), BASE_DIR)
    git_sync.git_commit_push(BASE_DIR, [rel], f"threads_{market}: 답글 {sent}개 게시")
    if sent:
        notify.notify(f"✅ 해외판 Threads({market}) 답글 게시", f"{sent}/{len(todo)}개 완료", tags=["white_check_mark"])


def auto(market):
    git_sync.git_pull(BASE_DIR)
    posted = os.path.join(BASE_DIR, "scripts", "posted_state", f"threads_{market}")
    for name in sorted(os.listdir(posted)) if os.path.isdir(posted) else []:
        if not name.endswith(".json"):
            continue
        with open(os.path.join(posted, name), "r", encoding="utf-8") as f:
            rec = json.load(f)
        age_h = (datetime.now(timezone.utc) - datetime.fromisoformat(rec["posted_at"])).total_seconds() / 3600
        if age_h > 96:
            continue
        print(f"== {rec['id']} ({rec['media_id']}, {age_h:.0f}시간 전)")
        lock_rel = os.path.relpath(os.path.join(state_dir(market), f"{rec['media_id']}.lock"), BASE_DIR)
        acquired, holder = git_sync.try_acquire_lock(BASE_DIR, lock_rel)
        if not acquired:
            print(f"  다른 컴퓨터({holder})가 처리 중 — 건너뜀")
            continue
        try:
            git_sync.git_pull(BASE_DIR)
            drafts = draft(market, rec["media_id"], rec.get("text", ""))
            if drafts and AUTO_SEND:
                send(market, rec["media_id"])
            elif drafts:
                notify.notify(f"📝 해외판 Threads({market}) 답글 초안 {len(drafts)}개",
                              "Claude에게 '해외 답글 확인해'라고 말하면 검토 후 게시합니다.", tags=["memo"])
        except Exception as e:
            print(f"  실패: {e}")
            notify.notify(f"❌ 해외판 Threads({market}) 답글 실패", f"{rec['id']}\n{notify.summarize_error(str(e))}", priority=4, tags=["warning"])
        finally:
            git_sync.release_lock(BASE_DIR, lock_rel)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--market", choices=["ja", "en"], required=True)
    ap.add_argument("cmd", choices=["auto", "draft", "show", "send"])
    ap.add_argument("media_id", nargs="?")
    args = ap.parse_args()
    threads_api.use_account(args.market)
    if args.cmd == "auto":
        auto(args.market)
    elif not args.media_id:
        ap.error("draft/show/send에는 MEDIA_ID가 필요합니다")
    else:
        {"draft": draft, "show": show, "send": send}[args.cmd](args.market, args.media_id)


if __name__ == "__main__":
    main()
