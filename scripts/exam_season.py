"""
시험 시즌 콘텐츠 배정(2026-09-26): 수능·임용 시즌에는 릴스/카드뉴스 3편 중 1편을 수험생 소재로 만들고, 캡션 링크를
합격운 페이지(/exam-luck, /exam-luck/imyong)로 보낸다. reel_rules.py / cardnews_rules.py / refill_queue.py가 쓴다.

시험 날짜는 앱의 src/lib/exam/seasons.ts와 같아야 한다(중등 임용은 9/30 공고 전이라 "예정"). 한쪽을 고치면 다른 쪽도 고칠 것.
"""
import re
from datetime import date

SITE = "saju-app-three-dusky.vercel.app"

EXAMS = {
    "suneung": {
        "noun": "수능",
        "path": "/exam-luck",
        "audience": "고3·N수생과 수험생 자녀를 둔 학부모",
        "events": [("수능", "2026-11-19", True)],
        # 소재 예시(겹치지 않게 참고만): 시험 앞 멘탈·컨디션·막판 공부 방식·실전 긴장·부모 마음
        "ideas": "막판에 불안해서 새 문제집 사는 사람 / 모의고사보다 실전에 강한 유형 / 시험 앞두고 잠 못 자는 유형 / 수험생 자녀에게 해주면 좋은 말",
    },
    "imyong": {
        "noun": "임용",
        "path": "/exam-luck/imyong",
        "audience": "초등·중등 임용시험 준비생(교대·사범대 졸업생 포함)",
        "events": [("초등 임용 1차", "2026-11-07", True), ("중등 임용 1차", "2026-11-28", False)],
        "ideas": "1차 교육학 논술 막판 정리 스타일 / 2차 수업실연·면접에 강한 유형 / 장기 수험에 지치는 패턴 / 스터디에서 드러나는 성향",
    },
}

EVERY = 3            # 3편 중 1편
LEAD_DAYS = 60       # 시험 60일 전부터 시즌 콘텐츠
# 대기열(최대 7개)에 쌓인 콘텐츠는 만든 뒤 며칠~일주일 뒤에 게시된다. 시험이 끝난 뒤에 "시험 앞두고" 글이 올라가지
# 않도록, 시험까지 이 일수 이하로 남으면 그 시험 소재는 더 만들지 않는다.
STOP_DAYS_BEFORE = 8

# 수험생 소재 전용 금지 표현(합격 보장·불합격 공포·확률). 공통 금지어(reel_rules.BANNED_WORDS)와 함께 검사한다.
EXAM_BANNED = ["합격한다", "합격합니다", "붙는다", "붙습니다", "합격 보장", "보장", "떨어진다", "떨어집니다", "불합격", "낙방", "재수각", "합격률", "확률", "%"]
DDAY_PATTERN = re.compile(r"D\s?-\s?\d+|디데이\s?\d+|\d+\s?일\s?(남|전)")


def _days_until(d, today):
    return (date.fromisoformat(d) - today).days


def active_kinds(today=None):
    """지금 시즌 콘텐츠를 새로 만들어도 되는 시험 종류(가까운 시험 순)."""
    today = today or date.today()
    out = []
    for kind, ex in EXAMS.items():
        upcoming = [_days_until(d, today) for _, d, _ in ex["events"] if STOP_DAYS_BEFORE < _days_until(d, today) <= LEAD_DAYS]
        if upcoming:
            out.append((min(upcoming), kind))
    return [k for _, k in sorted(out)]


def assign_slots(recent_entries, count, today=None):
    """새로 만들 count개 각각에 시험 종류(또는 None)를 배정한다. 최근 게시·대기 콘텐츠를 이어 봐서 시즌 소재가
    3편 중 1편꼴이 되게 하고, 수능·임용을 번갈아 쓴다."""
    kinds = active_kinds(today)
    if not kinds:
        return [None] * count
    since = 0  # 마지막 시험 소재 이후 일반 소재 개수
    last_kind = None
    for e in recent_entries:
        if e.get("exam") in EXAMS:
            since = 0
            last_kind = e["exam"]
        else:
            since += 1
    slots = []
    for _ in range(count):
        if since >= EVERY - 1:
            nxt = next((k for k in kinds if k != last_kind), kinds[0])
            slots.append(nxt)
            last_kind = nxt
            since = 0
        else:
            slots.append(None)
            since += 1
    return slots


def slot_brief(kind):
    """LLM에게 넘길 시험 정보(사용자 메시지용)."""
    ex = EXAMS[kind]
    dates = ", ".join(f"{label} {_fmt(d)}{'' if ok else '(예정)'}" for label, d, ok in ex["events"])
    return {"exam": kind, "시험": ex["noun"], "날짜": dates, "대상": ex["audience"], "소재 예시(참고만)": ex["ideas"]}


def _fmt(d):
    y, m, dd = map(int, d.split("-"))
    wd = "월화수목금토일"[date(y, m, dd).weekday()]
    return f"{m}월 {dd}일({wd})"


PROMPT_SECTION = """[시험 시즌 편 — 사용자 메시지의 '시험 시즌 배정'에서 exam 값이 있는 항목만]
- 그 항목은 해당 시험 준비생(또는 학부모)이 "어? 이거 나 얘기인데?" 하게 만드는 소재로 쓰고, 출력의 "exam" 필드에 배정값(suneung|imyong)을 그대로 적으세요. 배정이 null인 항목은 "exam": null이고 시험 이야기를 하지 마세요.
- 시험 이름(수능/임용)을 hook 또는 title에 넣어 대상이 바로 알아보게 하세요. subcategory는 "시험", category는 직업운(jigeop) 또는 사주상식(sangsik)으로.
- 합격·불합격을 점치거나 보장하지 마세요. 금지: 합격한다/붙는다/떨어진다/불합격/합격률/확률/%. 대신 막판 공부 방식·실전 컨디션·긴장 관리·강점과 주의점처럼 '흐름과 태도'를 다루세요.
- "D-30"처럼 남은 일수를 쓰지 마세요(게시일이 며칠 뒤라 숫자가 틀려집니다). 날짜가 필요하면 "11월 19일 수능"처럼 쓰세요.
- 화면 자막·캡션에서 "무료"는 '합격운 흐름' 또는 무료 4가지(여덟 글자·오행 비율·일간·성향 해석)만 가리킵니다."""


def validate_exam_fields(item, expected_kind, text_all):
    """시험 소재 항목 검증. expected_kind가 None이면 시험 이야기가 없어야 한다."""
    problems = []
    got = item.get("exam")
    if got in ("", "null"):
        got = None
    if expected_kind is None:
        if got is not None:
            problems.append("시험 시즌 배정이 없는 항목인데 exam 값이 있음")
        return problems
    if got != expected_kind:
        problems.append(f"시험 시즌 배정({expected_kind})과 exam 값({got})이 다름")
        return problems
    noun = EXAMS[expected_kind]["noun"]
    if noun not in text_all:
        problems.append(f"시험 소재인데 '{noun}'이라는 말이 없음")
    hits = [w for w in EXAM_BANNED if w in text_all]
    if hits:
        problems.append(f"수험생 소재 금지 표현: {hits}")
    if DDAY_PATTERN.search(text_all):
        problems.append("남은 일수(D-N 등)를 씀 — 게시일에 따라 틀려짐, 날짜로 쓸 것")
    return problems


def link_line(kind, ref):
    ex = EXAMS[kind]
    return f"🔗 내 {ex['noun']} 합격운 확인: {SITE}{ex['path']}?ref={ref}"


def pinned_tail(kind):
    return f"{EXAMS[kind]['noun']} 합격운 흐름은 프로필 링크에서 30초 무료로 확인!"
