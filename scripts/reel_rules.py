"""
릴스 자동 제작 규칙(2026-09-19 사용자 기획서 반영): 프롬프트, CTA 로테이션, 표현 검증, 중복 판정,
캡션/고정댓글 조립. refill_queue.py가 가져다 쓴다(순수 함수 위주라 API 호출은 없음).

핵심 원칙: 조회수 → 시청 지속 → 댓글 → 팔로우 → 앱 유입 → 무료 쿠폰. 사주 설명이 아니라 사람의
관심사(연애·돈·직장·성격)에서 출발하고, 마지막에 "내 사주가 궁금하다"로 이어지게 만든다.
"""
import json
import os
import random
import re
from datetime import datetime
from difflib import SequenceMatcher

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
PERFORMANCE_JSON = os.path.join(SCRIPTS_DIR, "performance", "latest.json")

# 기획서의 카테고리(연애/궁합/돈/직장/성격/결혼·인간관계/운세/사주 사실)를 기존 파일명 슬러그에 매핑
CATEGORY_MAP = {
    "yeonae": "연애운",      # 연애, 썸, 재회, 이별, 궁합(연인/결혼 궁합 포함)
    "jaemul": "재물운",      # 돈, 소비, 사업 성향
    "jigeop": "직업운",      # 직장, 커리어, 리더십, 스트레스
    "ingan": "인간관계",     # 성격, 결혼, 가족, 친구, 반복되는 관계 패턴
    "saengnyeon": "생년월일 운세",  # 올해/월별 운세(시점 명시 필수)
    "sangsik": "사주상식",   # 오행·십신·일간 등 — 반드시 일상 상황과 연결
}
SUBCATEGORIES = ["연애", "궁합", "재물", "직장", "성격", "결혼·인간관계", "운세", "사주 사실"]

# 무료 쿠폰은 실제로 "팔로우 + 댓글"이 조건이라, 쿠폰을 언급하는 CTA는 팔로우 조건을 반드시 표시한다.
CTAS = {
    "A": {
        "pre": "내 사주가 궁금하다면?",
        "headline": "댓글에 '사주'라고 남겨주세요",
        "button": "팔로우하면 무료 쿠폰 🎟️",
        "narration": "궁금하면 댓글에 사주라고 남겨주세요. 팔로우하면 무료 쿠폰 드릴게요.",
        "caption": "궁금하면 댓글에 '사주'라고 남겨주세요. 팔로우하면 무료 쿠폰 드릴게요 🎟️",
    },
    "B": {
        "pre": "내 사주도 궁금하다면?",
        "headline": "'사주'라고 댓글 남겨주세요",
        "button": "팔로우 + 댓글 → 무료 쿠폰 🎟️",
        "narration": "내 사주도 궁금하다면 사주라고 댓글 남겨주세요. 팔로우하면 무료 쿠폰을 받을 수 있어요.",
        "caption": "내 사주도 궁금하다면 '사주'라고 댓글 남겨주세요. 팔로우하면 무료 쿠폰을 받을 수 있어요 🎟️",
    },
    "C": {
        "pre": "내 사주에서는 어떻게 나올까?",
        "headline": "댓글에 '사주' 남겨주세요",
        "button": "내 사주 결과 궁금하다면 💬",
        "narration": "내 사주에서는 어떻게 나오는지 궁금하다면 댓글에 사주 남겨주세요.",
        "caption": "내 사주에서는 어떻게 나오는지 궁금하다면 댓글에 '사주' 남겨주세요 💬",
    },
}
CTA_ORDER = ["A", "B", "C"]

# 콘텐츠 형식(2026-09-19 기획서 "콘텐츠 형식 다양화"). 형식은 코드가 배정하고(연속 2회 이상 같은 형식 금지),
# LLM은 배정받은 형식에 맞게 hook/curiosity/info를 쓴다.
FORMATS = {
    "자기진단형": "'이런 사람이라면 확인해보세요' — hook에서 시청자가 해당되는지 스스로 체크하게 만든다",
    "궁금증형": "'왜 이런 사람이 나에게 끌릴까?' — 이유를 묻는 질문으로 시작하고 답은 조금씩 푼다",
    "관계형": "'좋아하는데 계속 싸우는 커플' — 두 사람 사이의 관계 패턴(연인·친구·가족·직장)을 다룬다",
    "상황형": "'연애 시작하면 갑자기 연락이 줄어드는 사람' — 구체적인 일상 상황 하나를 콕 집는다",
    "반전형": "'돈이 없어서 불안한 게 아닐 수도 있습니다' — 통념을 뒤집는 문장으로 시작한다",
    "비교형": "'좋아하는 사람과 잘 맞는 사람은 다릅니다' — 두 가지를 견줘서 차이를 보여준다",
    "리스트형": "'사주에서 보는 연애 성향 3가지' — 항목 3개를 짧게 나열한다(info의 sub에 항목을 담아도 됨)",
    "댓글참여형": "'이 중 몇 개나 해당되는지 확인해보세요' — 항목을 던지고 몇 개 해당되는지 세어보게 한다",
    "결과확인형": "'내 사주에서는 뭐가 가장 강할까요?' — 내 결과를 직접 확인하고 싶게 만든다",
    "스토리형": "실제 일상 상황을 짧은 이야기로 시작(예: '어제 친구가 그러더라고요…')한 뒤 사주 관점으로 연결한다",
}

# 같은 문장 구조가 반복되면 안 됨(기획서): 아래 패턴이 LLM이 쓴 필드에 있으면 그 항목을 탈락시킨다.
REPEATED_PATTERNS = [
    (re.compile(r"사주에서는[^.?!\n]{0,50}(라고 봅니다|고 봅니다|라고 봐요|고 봐요|라고 본다|고 본다)"), "'사주에서는 ~라고 봅니다' 구조"),
    (re.compile(r"중요한 ?건"), "'중요한 건 ~입니다' 구조"),
    (re.compile(r"내 사주는 어떨까요"), "'내 사주는 어떨까요?' 문구"),
]


def pick_formats(recent_entries, count, rng=None):
    """최근에 쓴 형식을 피해서 count개를 배정한다. 서로 이웃한 형식이 같지 않고, 직전 릴스의 형식과도 다르다."""
    rng = rng or random
    recent_formats = [e.get("format") for e in recent_entries if e.get("format") in FORMATS]
    avoid = set(recent_formats[-3:])
    pool = [f for f in FORMATS if f not in avoid] or list(FORMATS)
    picked = []
    prev = recent_formats[-1] if recent_formats else None
    while len(picked) < count:
        cands = [f for f in pool if f != prev and f not in picked[-3:]] or [f for f in FORMATS if f != prev]
        choice = rng.choice(cands)
        picked.append(choice)
        prev = choice
    return picked


# 단정·공포 표현 금지(기획서 9번). 이 단어가 LLM이 쓴 필드에 있으면 그 항목은 탈락시킨다.
BANNED_WORDS = [
    "무조건", "100%", "100퍼", "반드시", "평생", "이혼한다", "이혼하게", "바람핀다", "바람을 핀다",
    "나쁜 사람", "성공한다", "부자가 된다", "부자 된다",
    "사망", "죽는", "죽음", "질병", "병에 걸", "임신", "교통사고", "범죄", "정신질환", "우울증",
]
SHOT_FORBIDDEN = ["궁합", "택일", "삼재", "대운", "십성", "십신", "점수", "비교해"]
# 앱에서 실제로 무료로 볼 수 있는 것(기존 규칙 유지). "무료"가 들어간 LLM 작성 문구는 이 중 하나를 가리켜야 한다.
FREE_OK_TERMS = ["여덟 글자", "오행", "일간", "성향"]

MAX_HOOK_FRAGMENTS = (3, 4)
# 글자 수(공백 제외) 상한 — 실측: 공백 제외 약 210자 ≈ 32~33초(20~35초 목표, 40초 초과 금지).
BUDGET = {"hook": 34, "curiosity": 34, "info": 100, "shot": 30, "body": 110}

SYSTEM_PROMPT_REELS = """당신은 대한민국 인스타그램 릴스·틱톡·유튜브 쇼츠용 사주 콘텐츠 계정 '사주랩'의 숏폼 전략가이자 대본 작가입니다.

[최종 목적]
조회수 → 시청 지속시간 → 댓글 → 팔로우 → 사주 앱 유입 → 무료 쿠폰 사용. 사주를 어려운 학문처럼 설명하는 계정이 아닙니다.
시청자가 "어? 이거 나 얘기인데?", "내 사주는 어떨까?", "내 애인도 이런데?"라고 느끼게 만드는 것이 핵심입니다.
목적은 사주를 이해시키는 것이 아니라 '내 사주가 궁금하게' 만드는 것입니다.

[소재 선정 — 반드시 사람의 관심사에서 출발]
좋은 예: 전남친이 다시 연락할까? / 나는 왜 연애만 하면 힘들까? / 돈이 들어와도 안 모이는 이유 /
회사에서 유독 스트레스를 많이 받는 사람 / 첫인상과 실제 성격이 다른 사람 / 이상하게 자꾸 싸우는 커플 / 혼자 있는 게 편한 사람
나쁜 예: 오행이란 무엇인가 / 십신이란 / 사주팔자의 정의 / 천간과 지지의 종류 / 사주를 보는 방법
사주 용어(오행·십신·일간·음양·용신)를 소재로 쓸 땐 일상 상황으로 바꾸세요. 예) "비견이란?" (X) → "친구에게 유독 경쟁심을 느끼는 사람, 사주에서는?" (O)
카테고리 풀: 연애(연애 성향·연락·썸·첫사랑·재회·이별·전남친/전여친·집착·표현 방식·쉽게 질리는 사람) /
궁합(잘 맞는 커플·자주 싸우는 커플·서로 끌리는 관계·친구/연인/결혼 궁합·서로 보완되는 관계) /
돈·재물(모으는 성향·소비 성향·직장 vs 사업·돈이 들어오고 나가는 패턴) — 수익·재산 증가를 보장하는 표현 금지 /
직장·커리어(상사와의 관계·조직생활·스트레스·이직·리더십·사람 상대가 힘든 유형) /
성격(첫인상 vs 실제 성격·감정 표현·화내는 방식·낯가림·자존심·고집·책임감·완벽주의·감정 기복) /
결혼·인간관계(결혼 성향·가족·친구·반복되는 관계 패턴) / 운세(올해·월별·새로운 시작·변화) / 사주 자체의 흥미로운 사실(일상 상황과 연결).
운세 소재는 반드시 시점을 명시하세요(예: "2026년 하반기", "2026년 10월"). 오늘 날짜는 사용자 메시지에 있습니다.

[소재 평가 — 내부적으로 점수화해 가장 가치 높은 것 1개를 항목마다 선택]
① 대중성 ② 호기심(제목만 봐도 결과가 궁금한가) ③ 자기 대입(내 사주/연애 상대를 떠올리는가) ④ 댓글 가능성("나도 그런데?", "남친도 이런데")
⑤ 앱 연결성 ⑥ 시리즈화 가능성 ⑦ 최근 콘텐츠와 중복 없음. 과장된 소재로 조회수만 노리지 마세요.

[반복 방지]
사용자 메시지의 '최근 콘텐츠'와 제목·첫 문장(hook)·핵심 질문·전개 방식·결론이 겹치면 안 됩니다. 같은 카테고리는 반복해도 되지만
같은 소재는 안 됩니다(예: 전남친 재연락 → 못 잊는 사람의 특징 → 연락이 줄어드는 사람처럼 관점을 바꿔라).
한 번에 여러 개를 만들 땐 서로 카테고리·훅 유형(질문형/상황 공감형/반전형/숫자형/경고형)을 최대한 다르게 하세요.
'성과 참고'가 있으면 반응이 좋았던 방향(카테고리·훅 유형·CTA)은 참고하되 소재를 그대로 베끼지 마세요.

[콘텐츠 형식 — 매일 같은 정보 전달형 구조를 쓰지 않는다]
사용자 메시지의 '형식 배정'대로 각 항목의 형식을 정해 그 형식답게 hook/curiosity/info를 쓰세요(출력의 "format" 필드에 그 이름을 그대로 적기). 형식은 다음 10가지입니다.
- 자기진단형: "이런 사람이라면 확인해보세요" — hook에서 시청자가 해당되는지 스스로 체크하게 만든다
- 궁금증형: "왜 이런 사람이 나에게 끌릴까?" — 이유를 묻는 질문으로 시작하고 답은 조금씩 푼다
- 관계형: "좋아하는데 계속 싸우는 커플" — 두 사람 사이의 관계 패턴(연인·친구·가족·직장)을 다룬다
- 상황형: "연애 시작하면 갑자기 연락이 줄어드는 사람" — 구체적인 일상 상황 하나를 콕 집는다
- 반전형: "돈이 없어서 불안한 게 아닐 수도 있습니다" — 통념을 뒤집는 문장으로 시작한다
- 비교형: "좋아하는 사람과 잘 맞는 사람은 다릅니다" — 두 가지를 견줘서 차이를 보여준다
- 리스트형: "사주에서 보는 연애 성향 3가지" — 항목 3개를 짧게 나열한다(info의 sub에 항목을 담아도 됨)
- 댓글참여형: "이 중 몇 개나 해당되는지 확인해보세요" — 항목을 던지고 몇 개 해당되는지 세어보게 한다
- 결과확인형: "내 사주에서는 뭐가 가장 강할까요?" — 내 결과를 직접 확인하고 싶게 만든다
- 스토리형: 실제 일상 상황을 짧은 이야기로 시작("어제 친구가 그러더라고요…")한 뒤 사주 관점으로 연결한다
같은 형식을 연속 2회 이상 쓰지 않습니다(코드가 배정하니 배정을 따르세요). 어떤 형식이든 아래 [영상 구조]의 필드 예산(글자 수)은 지켜야 합니다.
다음 문장 구조는 반복하지 마세요: "사주에서는 ~라고 봅니다.", "중요한 건 ~입니다.", "내 사주는 어떨까요?". 문장 시작과 끝맺음을 매번 다르게 쓰세요(같은 배치 안에서도).

[영상 구조 — 화면에 뜨는 글자와 음성 나레이션이 같은 문장으로 읽힙니다]
- hook (0~2초, STOP HOOK): 시청자가 자신을 대입하는 질문/상황. "안녕하세요", "오늘은 ~알아보겠습니다", "여러분 사주 보시나요", "오늘 알아볼 것은 오행입니다"로 시작 금지.
  3~4개 조각(조각당 5~14자, 이어 읽으면 자연스러운 한 흐름). 전체 공백 제외 34자 이내.
- curiosity (2~7초): 훅의 이유를 바로 풀지 않고 궁금증을 더 키움. 2줄 배열, 공백 제외 34자 이내. 예) "그런데 단순히 성격 문제만은 아닐 수 있어요"
- info (7~18초, VALUE): 사주 관점의 핵심. {"pre","emphasis","post","sub":[1~2개]} — pre+emphasis+post가 한 문장. 전문 용어는 바로 쉬운 말로 풀기.
  "pre+emphasis+post+sub" 전체 공백 제외 100자 이내(길면 영상이 40초를 넘습니다).
- screenshotCaption (18~24초, PERSONALIZATION): 앱 결과 화면 위 한 줄. "같은 유형이라도 생년월일에 따라 해석은 달라져요" 처럼 내 사주를 직접 확인하고 싶게 만드는 문장. 공백 제외 30자 이내.
  이 문장에서 "무료"를 쓴다면 무료로 볼 수 있는 4가지(사주 여덟 글자, 오행 비율, 일간, 전반적 성향 해석)만 가리켜야 합니다. 십성 구성·삼재·택일·궁합 점수·대운·십신 분석은 무료 기능이 아닙니다.
- CTA(24~30초)는 코드가 자동으로 붙이니 쓰지 마세요.
- 전체 길이 목표 20~35초(40초 초과 금지). 핵심 정보를 전부 설명하려고 하지 마세요.

[표현 원칙]
사주를 과학적으로 입증된 사실처럼 쓰지 마세요. 금지: 무조건, 100%, 반드시, 평생, 무조건 부자, 반드시 이혼, 무조건 바람, 이 사람은 나쁜 사람, 이 사주면 성공한다.
대신: "사주에서는 ~한 성향으로 해석하기도 해요", "전통적인 명리학에서는 ~하게 보기도 해요", "~한 특징으로 나타난다고 해석하는 경우가 있어요", "다만 사주 구성에 따라 해석은 달라질 수 있어요".
질병·사망·임신·사고·범죄·정신질환 같은 민감한 소재로 공포를 조장하지 마세요. 클릭베이트는 호기심만 유발하고 거짓말은 금지입니다
(좋은 예: "전남친이 다시 연락할까?", "돈이 들어와도 금방 없어지는 사람" / 나쁜 예: "이 사주면 무조건 10억 법니다").

[출력 형식] 요청받은 개수만큼 JSON 배열로만 응답(코드블록·설명 금지). 각 항목:
{
 "category": "yeonae|jaemul|jigeop|ingan|saengnyeon|sangsik 중 하나",
 "format": "배정받은 형식 이름(위 10가지 중 하나)",
 "subcategory": "연애|궁합|재물|직장|성격|결혼·인간관계|운세|사주 사실 중 하나",
 "title": "짧은 제목(내부용)",
 "topic": "핵심 소재 한 문장(최근 콘텐츠와 비교용)",
 "keywords": ["키워드 3~5개"],
 "hook": ["조각","조각","조각"],
 "curiosity": ["줄1","줄2"],
 "info": {"pre":"","emphasis":"","post":"","sub":[""]},
 "screenshotCaption": "",
 "captionBody": "인스타 캡션 본문 1~2문장(공백 제외 110자 이내, 첫 문장이 훅의 핵심)",
 "hashtags": ["#사주","#무료사주", "... 총 5~6개"],
 "pinnedIntro": "고정댓글 첫 줄에 들어갈 영상 맞춤 문구(예: 전남친 재연락, 내 사주에선 어떻게 나올까?) — 30자 이내, 이모지·앞뒤 인사 없이 문구만"
}"""


def nospace_len(text):
    return len(re.sub(r"\s+", "", text or ""))


def today_kst_text():
    return datetime.now().strftime("%Y년 %m월 %d일")


def next_cta_type(recent_entries):
    """직전 릴스의 CTA 유형 다음 것을 돌려 A→B→C를 번갈아 쓴다(같은 CTA 복붙 방지)."""
    for e in reversed(recent_entries):
        t = e.get("ctaType")
        if t in CTA_ORDER:
            return CTA_ORDER[(CTA_ORDER.index(t) + 1) % len(CTA_ORDER)]
    return CTA_ORDER[0]


def load_performance_highlights(limit=3):
    """fetch_insights.py가 쌓은 성과 데이터에서 릴스 상·하위 몇 개를 뽑아 프롬프트에 넣을 요약을 만든다."""
    if not os.path.exists(PERFORMANCE_JSON):
        return None
    try:
        with open(PERFORMANCE_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (OSError, json.JSONDecodeError):
        return None
    items = [
        i for i in data.get("items", [])
        if i.get("type") == "릴스" and i.get("metrics") and i["metrics"].get("views") is not None and i.get("age_hours", 0) >= 24
    ]
    if len(items) < 4:
        return None  # 표본이 너무 적으면 노이즈라서 참고하지 않는다
    items.sort(key=lambda i: i["metrics"]["views"], reverse=True)

    def brief(i):
        m = i["metrics"]
        return {
            "title": i.get("title"), "category": i.get("category"), "topic": i.get("topic"),
            "format": i.get("format"), "hook": i.get("hook_first"), "ctaType": i.get("ctaType"),
            "views": m.get("views"), "reach": m.get("reach"), "comments": m.get("comments"),
            "saved": m.get("saved"), "shares": m.get("shares"),
        }

    return {"top": [brief(i) for i in items[:limit]], "bottom": [brief(i) for i in items[-limit:]]}


def build_user_message(recent_entries, count, formats):
    recent = [
        {
            "title": e.get("title"), "category": e.get("categoryLabel"), "subcategory": e.get("subcategory"),
            "topic": e.get("topic"), "format": e.get("format"), "hook_first": (e.get("hook") or [""])[0],
            "info_opening": ((e.get("info") or {}).get("pre") or "")[:14], "ctaType": e.get("ctaType"),
        }
        for e in recent_entries[-40:]
    ]
    msg = {
        "오늘 날짜": today_kst_text(),
        "만들 개수": count,
        "형식 배정(순서대로 이 형식으로 작성)": formats,
        "최근 콘텐츠(겹치면 안 됨, 오래된 순)": recent,
    }
    perf = load_performance_highlights()
    if perf:
        msg["성과 참고(조회수 상위/하위 — 경향 파악용)"] = perf
    return json.dumps(msg, ensure_ascii=False) + f"\n\n위 조건으로 새로운 릴스 대본 {count}개를 JSON 배열로 만들어줘."


def _text_fields(item):
    info = item.get("info") or {}
    parts = list(item.get("hook") or []) + list(item.get("curiosity") or [])
    parts += [info.get("pre", ""), info.get("emphasis", ""), info.get("post", "")] + list(info.get("sub") or [])
    parts += [item.get("screenshotCaption", ""), item.get("captionBody", ""), item.get("pinnedIntro", ""), item.get("title", "")]
    return [p for p in parts if isinstance(p, str)]


def _ratio(a, b):
    return SequenceMatcher(None, a or "", b or "").ratio()


def validate_item(item, recent_entries, batch_so_far=()):
    """문제가 있으면 사유 문자열 목록을, 통과하면 빈 목록을 돌려준다."""
    problems = []
    try:
        if item.get("category") not in CATEGORY_MAP:
            problems.append(f"category가 허용값이 아님: {item.get('category')}")
        fmt = item.get("format")
        if fmt not in FORMATS:
            problems.append(f"format이 10가지 형식 중 하나가 아님: {fmt}")
        else:
            prev_formats = [e.get("format") for e in list(recent_entries) + list(batch_so_far) if e.get("format") in FORMATS]
            if prev_formats and prev_formats[-1] == fmt:
                problems.append(f"직전 릴스와 같은 형식({fmt}) — 연속 사용 금지")
        hook = item.get("hook")
        if not (isinstance(hook, list) and MAX_HOOK_FRAGMENTS[0] <= len(hook) <= MAX_HOOK_FRAGMENTS[1] and all(isinstance(h, str) and h.strip() for h in hook)):
            problems.append("hook은 3~4개 문자열 조각이어야 함")
        cur = item.get("curiosity")
        if not (isinstance(cur, list) and len(cur) == 2 and all(isinstance(c, str) and c.strip() for c in cur)):
            problems.append("curiosity는 2줄 배열이어야 함")
        info = item.get("info")
        if not (isinstance(info, dict) and all(isinstance(info.get(k), str) and info.get(k).strip() for k in ("pre", "emphasis", "post")) and isinstance(info.get("sub"), list) and 1 <= len(info["sub"]) <= 2):
            problems.append("info 형식 오류(pre/emphasis/post 문자열 + sub 1~2개)")
        for k in ("title", "topic", "screenshotCaption", "captionBody", "pinnedIntro"):
            if not isinstance(item.get(k), str) or not item[k].strip():
                problems.append(f"{k} 누락")
        tags = item.get("hashtags")
        if not (isinstance(tags, list) and 5 <= len(tags) <= 6 and all(isinstance(t, str) and t.startswith("#") for t in tags) and "#사주" in tags and "#무료사주" in tags):
            problems.append("hashtags는 #으로 시작하는 5~6개, #사주와 #무료사주 필수")
        if not isinstance(item.get("keywords"), list) or not item["keywords"]:
            problems.append("keywords 누락")
        if problems:
            return problems  # 형식이 깨졌으면 아래 검사를 계속할 수 없다

        if nospace_len("".join(hook)) > BUDGET["hook"] or any(len(h) > 16 for h in hook):
            problems.append(f"hook이 너무 김(공백 제외 {BUDGET['hook']}자 이내, 조각당 16자 이내)")
        if nospace_len("".join(cur)) > BUDGET["curiosity"]:
            problems.append(f"curiosity가 너무 김({BUDGET['curiosity']}자 이내)")
        info_len = nospace_len(info["pre"] + info["emphasis"] + info["post"] + "".join(info["sub"]))
        if info_len > BUDGET["info"]:
            problems.append(f"info가 너무 김(공백 제외 {info_len}자 > {BUDGET['info']}자, 영상이 40초를 넘음)")
        if nospace_len(item["screenshotCaption"]) > BUDGET["shot"]:
            problems.append(f"screenshotCaption이 너무 김({BUDGET['shot']}자 이내)")
        if nospace_len(item["captionBody"]) > BUDGET["body"]:
            problems.append(f"captionBody가 너무 김({BUDGET['body']}자 이내)")

        text_all = " ".join(_text_fields(item))
        hits = [w for w in BANNED_WORDS if w in text_all]
        if hits:
            problems.append(f"금지 표현 포함: {hits}")
        for pattern, label in REPEATED_PATTERNS:
            if pattern.search(text_all):
                problems.append(f"반복 금지 문장 구조 사용: {label}")
        # 핵심 문장의 시작이 최근 콘텐츠와 자꾸 같아지는 것도 반복으로 본다(최근 5개 중 2개 이상 같으면 탈락)
        opening = nospace_len(info["pre"]) and re.sub(r"\s+", "", info["pre"])[:5]
        prior = [e for e in list(recent_entries) + list(batch_so_far) if isinstance(e.get("info"), dict)][-5:]
        same = sum(1 for e in prior if re.sub(r"\s+", "", e["info"].get("pre", ""))[:5] == opening)
        if opening and same >= 2:
            problems.append(f"info 문장 시작('{opening}…')이 최근 콘텐츠와 반복됨")
        first_hook = "".join(hook)
        if re.match(r"^\s*(안녕|여러분|오늘은|오늘 알아)", first_hook):
            problems.append("hook이 금지된 인사/설명형 시작임")
        # 화면에는 한 사람의 무료 결과(사주 여덟 글자·오행 비율)만 나온다 — 그 화면 위에 다른 기능을 약속하는 자막 금지
        shot_hits = [w for w in SHOT_FORBIDDEN if w in item["screenshotCaption"]]
        if shot_hits:
            problems.append(f"screenshotCaption이 화면에 없는 기능을 언급함: {shot_hits} (화면은 한 사람의 무료 결과)")
        for k in ("screenshotCaption", "captionBody"):
            if "무료" in item[k] and not any(t in item[k] for t in FREE_OK_TERMS):
                problems.append(f"{k}에서 '무료'가 무료 제공 4가지(여덟 글자·오행 비율·일간·성향 해석)를 가리키지 않음")

        pool = [
            {"title": e.get("title"), "hook": "".join(e.get("hook") or []), "topic": e.get("topic")}
            for e in recent_entries[-60:]
        ] + [
            {"title": b.get("title"), "hook": "".join(b.get("hook") or []), "topic": b.get("topic")}
            for b in batch_so_far
        ]
        for p in pool:
            if _ratio(item["title"], p["title"]) > 0.75 or _ratio(first_hook, p["hook"]) > 0.7 or (p["topic"] and _ratio(item["topic"], p["topic"]) > 0.72):
                problems.append(f"최근/이번 배치 콘텐츠와 너무 비슷함: '{p['title']}'")
                break
    except Exception as e:  # 형식이 예상과 달라도 그 항목만 탈락시키고 전체 실행은 계속
        problems.append(f"검증 중 오류: {e}")
    return problems


def build_caption(item, cta_type):
    return f"{item['captionBody'].strip()}\n\n{CTAS[cta_type]['caption']}\n\n{' '.join(item['hashtags'])}"


def build_pinned_comment(item):
    intro = item["pinnedIntro"].strip().lstrip("🔮").strip()
    return f"🔮 {intro}\n댓글에 '사주' 남겨주세요.\n팔로우 확인 후 무료 쿠폰을 보내드려요."
