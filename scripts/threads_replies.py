"""Threads "무료 풀이" 글의 답글에 풀이 답글 달기 (반자동).

  python scripts/threads_replies.py draft MEDIA_ID   # 새 답글 읽기 → 생일 해석 → 일간 계산 → 풀이 초안
  python scripts/threads_replies.py show MEDIA_ID    # 초안 보기
  python scripts/threads_replies.py send MEDIA_ID    # 초안을 실제 답글로 게시(승인 후에만!)
  python scripts/threads_replies.py auto             # 최근 4일 무료 풀이 글 draft → 검사 통과분 자동 send
                                                     (작업 스케줄러 SajuThreadsReplyDraft 매일 10:00·21:30·22:30·23:30 — 무료 풀이 글(21:00)의
                                                      첫 1시간 반응이 노출을 좌우해서 10/4에 21:30·22:30 추가)
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
import node_bin  # noqa: E402
import threads_api  # noqa: E402
from refill_queue import call_claude_raw  # noqa: E402

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE_DIR = os.path.join(BASE_DIR, "scripts", "posted_state", "threads_replies")
RENDER_ROOT = os.environ.get("SAJU_RENDER_DIR", os.path.join(os.path.expanduser("~"), "SajuAutoRender"))
DRAFT_DIR = os.path.join(RENDER_ROOT, "threads_drafts")
SITE = "saju-app-three-dusky.vercel.app"

BANNED = ["완치", "무조건", "반드시", "100%", "확실히", "틀림없", "당첨될", "당첨돼", "합격합니다", "합격해요", "떨어져요", "떨어집니다", "평생", "절대", "timing", "ilgan", "오늘만", "선착순", "마감", "한정", "후회할"]
MAX_LEN = 430

EXTRACT_PROMPT = """너는 Threads 답글에서 생년월일 정보를 뽑는 파서야. 각 답글마다 JSON 객체 하나를 돌려줘.
- people: 답글에 적힌 사람별 [{"date":"YYYY-MM-DD","lunar":true/false,"gender":"남/여/null"}]. 날짜가 두 개면 두 명(보통 본인+상대).
  · 두 자리 연도는 00~26이면 2000년대, 그 외는 1900년대. "801216" = 1980-12-16, "78 0826" = 1978-08-26.
  · "음", "음력"이 있으면 lunar=true, 없거나 "양"이면 false. 시간(오후4시, 17:20, 0.53 등)은 무시.
  · 붙여 쓴 숫자는 6자리(YYMMDD) 또는 8자리(YYYYMMDD)일 때만 읽는다. 7·9자리처럼 자릿수가 애매하면 추측하지 말고 그 사람은 제외(확실하지 않은 일간이 나가면 신뢰가 깨진다).
  · 날짜를 확실히 알 수 없으면 people=[].
- topic: 궁금한 것을 짧게(예: "돈", "연애", "일", "재회", "결혼운", "취업", "합격운", "성격"). 없으면 "성격".
- question: 구체적인 질문 문장이 있으면 그대로 요약(없으면 null).
출력: {"items":[{"id":"...","people":[...],"topic":"...","question":...}, ...]} JSON만."""

WRITE_PROMPT = f"""너는 무료 사주 서비스 '사주랩' Threads 계정 담당자야. '생일 적어주면 사주 타입 알려줄게' 글에 달린 답글마다 풀이 답글을 쓴다.
규칙:
- 각 사람의 일간·유형은 주어진 값만 쓴다(직접 계산하거나 바꾸지 말 것). 첫 문장은 "[유형](일간 이름) 일간이야"로 유형을 알려준다(예: "이슬비형(계수) 일간이야."). 답글은 그 사람 글 밑에 달리므로 아이디·이름을 부르지 말고, 아이디로 별명을 지어내지도 말 것.
- 그다음 1~2문장: 물어본 주제(topic/question)에 맞춰(답글에 주제가 없고 post_promise가 있으면 그 주제로 — 예: "연애" → 연애 스타일, "돈" → 모으는/쓰는 타입, "올해 남은 흐름" → timing의 이번 달~연말 흐름, "잘 맞는 사람" → 잘 맞는 기운) 주어진 ilgan 내용(love/work/money/relations/summary)에서 핵심만 쉬운 말로. 문장을 그대로 복사하지 말고 그 사람 질문에 답하듯 다듬는다.
- 두 사람이 있으면 두 사람 유형을 모두 말하고, 둘이 어떤 식으로 맞물리는지 한 문장(궁합 상세 안내는 마지막 문장에서).
- 재회·로또·합격 여부·"운이 열리나요" 같은 예/아니오 질문엔 단정하지 말고, 그 유형이 그런 시기에 잘 풀리는 방식/태도를 말해준다.
- 금지: 무조건, 반드시, 100%, 확실히, 절대, 평생, 당첨·합격·불합격 단정, 공포 조장, 건강·의료 판단.
- 시기: 연애·재회·돈·취업 주제는 각 사람의 **timing_pick만** 쓴다(코드가 성별·주제에 맞는 기운이 들어오는 해/달을 이미 골라 줬다. raw timing으로 관성/재성 등을 직접 판단하지 말 것 — 틀린다). timing_pick이 있으면 반드시 1문장으로 그 시기를 짚어준다(예: "네 쪽은 2028년 무신년에 인연 기운(관성)이 들어오고, 가까운 달로는 2026년 10~11월이 열려 있어"). months가 있으면 가장 가까운 달도 같이 말한다. timing_pick이 None이거나 years·months가 비어 있으면 그 사람의 시기는 조용히 생략한다(지어내지 말 것). 어떤 경우에도 timing, timing_pick, ilgan, 데이터, 값 같은 내부 용어를 답글에 쓰지 말고 "시기를 짚을 수 없다"는 말도 하지 않는다. 두 사람이면 사람별로 각자 말한다. "올해 남은 흐름"처럼 주제 약속(post_promise)이 있는 풀이는 raw timing의 이번 달~연말 months 흐름을 쓴다.
- 질병·수술·완치 같은 의료 판단은 하지 않는다.
- 정보를 넉넉히 준다(2026-10-06, 수익 목표 — 무료 답글이 알차야 "그럼 상세는 얼마나 더 나올까" 하고 들어온다). 구성: ① 유형 소개 ② 각 사람의 핵심 성향 한 문장씩(ilgan의 love/relations/summary에서 구체적인 행동·말버릇 수준으로) ③ 둘이 맞물리는 지점 + 부딪히는 지점 ④ 바로 써먹을 수 있는 구체 팁 한 문장(예: "서운하면 '됐어'로 끊지 말고 이유를 한 줄 붙여") ⑤ timing_pick 시기 한 문장(있을 때) ⑥ 마무리 후킹. 개인(한 명) 질문이면 ③은 생략하고 ②를 풍부하게.
- 마지막은 1~2문장. 광고처럼 들리면 안 되고, 친구가 "이건 알고 가" 하고 알려주는 말투로 쓴다(2026-10-06, 수익 목표). **지금 준 풀이는 일간 하나만 본 반쪽이고, 정작 중요한 부분(두 사람이 부딪히는 지점·풀리는 시기·돈/일 타이밍)은 아직 못 봤다**는 사실을 짚어서 "이대로 넘기면 아깝다"는 손실회피 느낌을 만든다. 근거는 사실만: 태어난 시간·오행 비율·다른 기둥까지 같이 봐야 전체 그림이 나온다. 그리고 그걸 볼 곳으로 "프로필 링크에 상세 풀이로 정리해뒀어" 정도를 가볍게 덧붙인다(링크 주소·가격·할인 언급 금지, "무료"라고 강조하지 말 것 — 상세 풀이는 유료다).
  · 후킹 장치 — "열린 고리"를 하나 남긴다: 방금 준 풀이에서 **일간만으로는 안 풀리는 질문 하나**를 짚고, "그건 여기서 못 줘, 프로필 링크 상세에 풀어놨어"로 닫는다. 근거는 실제 상품 내용과 일치해야 한다 — 궁합 상세는 두 사람의 오행 비율·일주·년주·궁합 점수로 어디서 맞고 어디서 부딪히는지·어떻게 풀지를 풀어주고, 사주 상세는 재물·연애·직업·인간관계·올해 흐름을 길게 풀어준다. 이 범위 밖(예: 구체적 날짜 점지, 상대 마음 읽기)은 약속하지 말 것. 주제별 예)
  · 연애·재회·두 사람: "근데 여기까진 일간만 본 반쪽이야. 둘 오행 비율까지 같이 봐야 어디서 맞고 어디서 부딪히는지가 나와서 여기선 못 줘. 이것만 믿고 판단하면 아까워 — 프로필 링크에 궁합 상세로 풀어놨어."
  · 돈·일·취업·시기: "이건 일간 하나만 본 흐름이야. 사주 전체 오행 균형까지 봐야 어디서 새고 어디서 모이는지가 갈려서, 이대로 넘기면 놓치는 부분이 생겨. 프로필 링크에 상세로 풀어놨어."
  · 그 외: "답글로 줄 수 있는 건 여기까지야. 사주 전체를 보면 꽤 달라져서 지금 건 반쪽이야. 프로필 링크에 상세 풀이 있어."
  예시를 그대로 복사하지 말고 답글마다 문장 구조·단어를 바꾼다.
  금지(신뢰가 깨지면 수익도 깨진다): 가짜 긴급·희소성(오늘만, 마감, 선착순, 한정), 그 사람에게 불행·이별·실패가 닥친다는 암시, "안 보면 후회해" 같은 협박, 상품에 없는 기능 언급(있는 건 사주 상세 풀이=재물·연애·직업·인간관계·올해 흐름, 궁합 상세 풀이뿐).
  **결제 유도 금지 대상**: 2007년 이후 출생자가 있거나, 글에 오늘/방금 이별·취중·극단적 힘듦이 보이면 손실회피 문장을 쓰지 말고 따뜻한 한마디로 끝낸 뒤 "궁금하면 프로필 링크에 있어" 정도만 쓴다.
- 말투: Threads 감성의 친근한 반말(~야, ~해, ~더라, ~거든). 딱딱한 안내문·존댓말·"~해보세요" 금지. 이모지는 0~2개. 전체 {MAX_LEN}자 이내. 해시태그 금지.
- 생일이 없는 답글(people 비어 있음)은 "생년월일(양력/음력) 답글로 남겨주면 풀어줄게 🙏" 한 문장. DM 얘기면 "DM은 확인이 어려워서, 답글로 남겨주면 바로 풀어줄게 🙏".
- 답글 text 안에서는 큰따옴표(")를 절대 쓰지 말고 필요하면 작은따옴표(')만 쓴다(JSON이 깨진다). 줄바꿈은 
으로만.
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
        [node_bin.find_node(), "--no-warnings", os.path.join(BASE_DIR, "scripts", "threads_ilgan.mjs"), "--batch"],
        input=node_input, capture_output=True, text=True, encoding="utf-8", cwd=BASE_DIR, timeout=60,
    )
    if out.returncode != 0:
        raise RuntimeError(f"일간 계산 실패: {out.stderr[-500:]}")
    return json.loads(out.stdout)


_ROMANCE_WORDS = ("연애", "재회", "결혼", "궁합", "인연", "썸", "사랑", "남친", "여친", "고백")
_MONEY_WORDS = ("돈", "재물", "사업", "투자", "월급", "금전", "부자")
_JOB_WORDS = ("취업", "승진", "합격", "시험", "공부", "일", "직장", "커리어", "이직")


def _merge_months(yms):
    """['2026-10','2026-11','2027-04'] -> ['2026년 10~11월','2027년 4월']"""
    out, run = [], []
    def flush():
        if not run:
            return
        y0, m0 = run[0]
        y1, m1 = run[-1]
        out.append(f"{y0}년 {m0}~{m1}월" if len(run) > 1 and y0 == y1 else (f"{y0}년 {m0}월" if len(run) == 1 else f"{y0}년 {m0}월~{y1}년 {m1}월"))
    prev = None
    for ym in yms:
        y, m = int(ym[:4]), int(ym[5:7])
        if prev and (y * 12 + m) == (prev[0] * 12 + prev[1] + 1):
            run.append((y, m))
        else:
            flush()
            run = [(y, m)]
        prev = (y, m)
    flush()
    return out


def pick_timing(person, topic):
    """주제·성별에 맞는 기운이 들어오는 해/달을 코드가 미리 골라 준다(AI가 관성/재성 규칙을 잘못 적용하던 문제 방지).
    연애류: 여성=관성, 남성=재성(전통 해석) / 돈=재성 / 취업·승진·합격=관성 / 그 외·성별 모름이면 None."""
    t = person.get("timing") or {}
    topic = topic or ""
    gender = person.get("gender")
    if any(w in topic for w in _ROMANCE_WORDS):
        if gender not in ("남", "여"):
            return None
        key, label = ("관성", "인연 기운(관성)") if gender == "여" else ("재성", "인연 기운(재성)")
    elif any(w in topic for w in _MONEY_WORDS):
        key, label = "재성", "돈 기운(재성)"
    elif any(w in topic for w in _JOB_WORDS):
        key, label = "관성", "일·합격 기운(관성)"
    else:
        return None
    years = [{"year": y["year"], "ganzhi": y["ganzhi"]} for y in t.get("years", []) if y.get("group") == key][:2]
    months = _merge_months([m["ym"] for m in t.get("months", []) if m.get("group") == key])
    if not years and not months:
        return {"기운": label, "years": [], "months": [], "note": "가까운 5년 안에 이 기운이 뚜렷하게 들어오지 않음 — 시기를 지어내지 말 것"}
    return {"기운": label, "years": years, "months": months}


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


def draft(media_id, promise=None):
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
            person = {k: c.get(k) for k in ("date", "lunar", "gender", "typeName", "hangul", "dayGan", "metaphor", "keywords", "summary", "love", "work", "money", "relations", "timing")}
            person["timing_pick"] = pick_timing(person, ex.get("topic"))
            people.append(person)
        cases.append({"id": r["id"], "username": r.get("username"), "original": r.get("text", ""), "topic": ex.get("topic"), "question": ex.get("question"), "people": people})

    drafts = []
    for i in range(0, len(cases), 12):
        chunk = cases[i:i + 12]
        payload = [{k: c[k] for k in ("id", "username", "original", "topic", "question", "people")} for c in chunk]
        if promise:
            # 글이 "생일만 적으면 연애 스타일 알려줄게"처럼 주제를 약속했으면, 답글에 주제가 없을 때 그 주제로 답한다.
            for item in payload:
                item["post_promise"] = promise
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
        # 노트북·데스크톱이 같은 시각에 돌면 같은 답글에 두 번 답할 수 있어 글마다 git 락을 잡는다.
        lock_rel = os.path.relpath(os.path.join(STATE_DIR, f"{rec['media_id']}.lock"), BASE_DIR)
        acquired, holder = git_sync.try_acquire_lock(BASE_DIR, lock_rel)
        if not acquired:
            print(f"  다른 컴퓨터({holder})가 처리 중 — 건너뜀")
            continue
        try:
            git_sync.git_pull(BASE_DIR)  # 락을 잡는 사이 다른 컴퓨터가 답한 기록을 받아온다
            drafts = draft(rec["media_id"], rec.get("promise"))
            if drafts:
                send(rec["media_id"])
        except Exception as e:
            print(f"  초안 실패: {e}")
            # 스케줄러로 돌 땐 출력이 안 보여 원인(어떤 파일을 못 찾았는지 등)을 알 수 없었다 — 전체 트레이스백을 로컬 파일에 남긴다.
            try:
                import traceback

                os.makedirs(RENDER_ROOT, exist_ok=True)
                with open(os.path.join(RENDER_ROOT, "threads_replies_error.log"), "a", encoding="utf-8") as lf:
                    lf.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {rec['id']} node={node_bin.find_node()!r} exists={os.path.exists(node_bin.find_node())} USERPROFILE={os.environ.get('USERPROFILE')!r} LOCALAPPDATA={os.environ.get('LOCALAPPDATA')!r} home={os.path.expanduser('~')!r} nodejs_dir={[(d, os.listdir(os.path.join(os.environ.get('LOCALAPPDATA', ''), 'nodejs', d))[:6]) for d in os.listdir(os.path.join(os.environ.get('LOCALAPPDATA', ''), 'nodejs'))] if os.path.isdir(os.path.join(os.environ.get('LOCALAPPDATA', ''), 'nodejs')) else 'NO_DIR'}\n{traceback.format_exc()}\n")
            except OSError:
                pass
            notify.notify("❌ Threads 풀이 초안 실패", f"{rec['id']}\n{notify.summarize_error(str(e))}", priority=4, tags=["warning"])
        finally:
            git_sync.release_lock(BASE_DIR, lock_rel)


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "auto":
        auto()
        sys.exit(0)
    if len(sys.argv) != 3 or sys.argv[1] not in ("draft", "show", "send"):
        print(__doc__)
        sys.exit(1)
    {"draft": draft, "show": show, "send": send}[sys.argv[1]](sys.argv[2])
