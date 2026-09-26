"""
카드뉴스(캐러셀) 자동 제작 규칙 — 2026-09-20 2주 실험용.

배경: 카드뉴스 18편의 평균 도달이 2(사실상 팔로워 5명만 봄)이고 소재도 "지지·지장간 설명"처럼 용어 해설형이라,
릴스에 적용한 기획서 규칙 중 ① 첫 장 훅(사람의 관심사에서 출발) ② 마지막 장 CTA(A/B/C 로테이션)를 같은 원칙으로 적용하고
게시 빈도를 줄여서(run_daily_cardnews.py의 최소 간격) 2주 뒤 도달을 비교한다.
공통 규칙(금지 표현, 무료 표현, CTA 문구, 반복 문장 구조)은 reel_rules.py를 그대로 재사용한다.
"""
import json
import re
from datetime import datetime

import exam_season
import reel_rules as rr

# 캐러셀에 잘 맞는 형식만 배정한다(스토리형처럼 이야기 전개가 필요한 것은 슬라이드 수가 부족해 제외).
CARD_FORMATS = ["자기진단형", "리스트형", "댓글참여형", "비교형", "반전형", "궁금증형", "상황형"]

CARD_CATEGORIES = list(rr.CATEGORY_MAP.values())  # 연애운/재물운/직업운/인간관계/생년월일 운세/사주상식

BUDGET = {"title": 24, "coverSub": 22, "label": 10, "keyword": 13, "desc": 80, "body": 110}

SYSTEM_PROMPT_CARDNEWS = """당신은 인스타그램 사주 콘텐츠 계정 '사주랩'의 카드뉴스(캐러셀) 대본을 쓰는 카피라이터입니다.

[목적]
카드뉴스를 본 사람이 "어? 이거 나 얘기인데?"라고 느끼고 저장·공유·댓글을 하고, 마지막에 '내 사주가 궁금하다'로 이어지게 만드는 것입니다.
사주를 설명하는 강의가 아닙니다. 지금까지 "지지가 뭐다, 지장간이 뭐다" 같은 용어 해설형이라 노출이 거의 없었습니다(도달 2).

[소재 — 반드시 사람의 관심사에서 출발]
좋은 예: 전남친이 다시 연락할까? / 연애만 하면 힘든 이유 / 돈이 들어와도 안 모이는 이유 / 회사에서 유독 스트레스 받는 사람 / 첫인상과 실제 성격이 다른 사람 / 자꾸 싸우는 커플 / 혼자 있는 게 편한 사람
나쁜 예: 오행이란 / 십신이란 / 사주팔자의 정의 / 천간과 지지의 종류 / 사주를 보는 방법
사주 용어를 쓸 땐 일상 상황으로 바꾸고, 용어가 나오면 바로 쉬운 말로 풀어주세요. 운세 소재는 시점을 명시(예: "2026년 10월").
사용자 메시지의 '최근 카드뉴스'와 제목·소재·핵심 질문이 겹치면 안 됩니다. 같은 카테고리라도 관점을 바꾸세요.

[형식 배정] 사용자 메시지의 '형식 배정'대로 각 세트의 형식을 정하세요(출력의 "format"에 이름 그대로). 같은 형식을 연속으로 쓰지 않습니다.
- 자기진단형: "이런 사람이라면 확인해보세요" — 슬라이드마다 해당 여부를 체크할 항목
- 리스트형: "○○ 성향 3가지" — 항목을 짧게 나열
- 댓글참여형: "이 중 몇 개나 해당되는지 세어보세요" — 슬라이드마다 항목, 마지막에 개수로 자기 대입
- 비교형: 두 가지(A와 B)를 견줘서 차이를 보여줌
- 반전형: 통념을 뒤집는 문장으로 시작
- 궁금증형: "왜 이런 사람이 나에게 끌릴까?" 같은 질문으로 시작
- 상황형: 구체적인 일상 상황 하나를 콕 집음

[구성] 표지 1장(훅) + 내용 3~5장 + CTA 1장(CTA는 코드가 붙임 — 쓰지 마세요)
- title(표지 훅): 시청자를 콕 집는 한마디. 공백 제외 24자 이내, 2줄 이내. 설명투("~알아볼게요", "~이유가 있어요")·제작자 시점 금지.
  "안녕하세요", "오늘은 ~알아보겠습니다"로 시작 금지. 예) "연락도 내가 먼저, 손해도 내가 먼저"
- hookAccent: title 안에 글자 그대로 들어있는 핵심 어구 2~8자(금색으로 강조됨)
- coverSub: 표지 부제. 공백 제외 22자 이내. 예) "몇 개나 해당되는지 세어보세요"
- items 각 장: {"symbol":"숫자(1,2,3…) 또는 이모지 1개","label":"8~10자 이내 짧은 이름","keyword":"13자 이내 핵심어","desc":"1~2문장, 공백 제외 80자 이내"}
  desc는 '상황 → 사주 관점의 해석' 순서로 쓰세요. 마지막 장은 "같은 유형이라도 사주 구성에 따라 달라요" 같은 자기 대입 문장으로 마무리해도 좋습니다.

[표현 원칙]
사주를 과학적으로 입증된 사실처럼 쓰지 마세요. 금지: 무조건, 100%, 반드시, 평생, 무조건 부자, 반드시 이혼, 무조건 바람, 이 사람은 나쁜 사람, 이 사주면 성공한다.
대신: "사주에서는 ~한 성향으로 해석하기도 해요", "전통적인 명리학에서는 ~하게 보기도 해요", "~한 특징으로 나타난다고 해석하는 경우가 있어요".
"사주에서는 ~라고 봅니다", "중요한 건 ~입니다", "내 사주는 어떨까요?" 구조는 반복하지 마세요. 질병·사망·임신·사고·범죄 같은 민감한 소재로 공포를 조장하지 마세요.
captionBody와 pinnedIntro에는 "댓글"이라는 말을 쓰지 마세요(댓글 유도는 코드가 붙이는 CTA가 따로 담당하므로 두 번 나오면 안 됩니다).
captionBody에서 "무료"를 쓴다면 무료로 볼 수 있는 4가지(사주 여덟 글자, 오행 비율, 일간, 전반적 성향 해석)만 가리켜야 합니다. 십성 구성·삼재·택일·궁합 점수·대운 등은 무료 기능이 아닙니다.

""" + exam_season.PROMPT_SECTION.replace("category는 직업운(jigeop) 또는 사주상식(sangsik)으로", "category는 직업운 또는 사주상식으로").replace("hook 또는 title", "title") + """

[출력] 요청받은 개수만큼 JSON 배열로만 응답(코드블록·설명 금지). 각 항목:
{
 "category": "연애운|재물운|직업운|인간관계|생년월일 운세|사주상식 중 하나",
 "exam": "시험 시즌 배정값(suneung|imyong) 또는 null",
 "subcategory": "연애|궁합|재물|직장|성격|결혼·인간관계|운세|사주 사실|시험 중 하나(시험은 시험 시즌 편만)",
 "format": "배정받은 형식 이름",
 "title": "표지 훅", "hookAccent": "title 안의 강조 어구", "coverSub": "표지 부제",
 "topic": "핵심 소재 한 문장(최근 카드뉴스와 비교용)", "keywords": ["키워드 3~5개"],
 "items": [{"symbol":"","label":"","keyword":"","desc":""}],
 "captionBody": "인스타 캡션 본문 1~2문장(공백 제외 110자 이내, 저장하고 싶게 만드는 문장, 📌 포함 가능)",
 "hashtags": ["#사주","#무료사주","... 총 5~6개"],
 "pinnedIntro": "고정댓글 첫 줄 문구(30자 이내, 이모지·인사 없이)"
}"""


def build_user_message(recent_sets, count, formats, exam_slots=None):
    recent = [
        {"title": s.get("title"), "category": s.get("category"), "topic": s.get("topic"), "format": s.get("format"), "exam": s.get("exam")}
        for s in recent_sets[-40:]
    ]
    msg = {
        "오늘 날짜": rr.today_kst_text(),
        "만들 개수": count,
        "형식 배정(순서대로 이 형식으로 작성)": formats,
        "최근 카드뉴스(겹치면 안 됨, 오래된 순)": recent,
    }
    if exam_slots and any(exam_slots):
        msg["시험 시즌 배정(순서대로, null이면 일반 소재)"] = [exam_season.slot_brief(k) if k else None for k in exam_slots]
    return json.dumps(msg, ensure_ascii=False) + f"\n\n위 조건으로 새 카드뉴스 {count}개를 JSON 배열로 만들어줘."


def pick_formats(recent_sets, count):
    return rr.pick_formats(recent_sets, count, allowed=CARD_FORMATS)


def validate_item(item, recent_sets, batch_so_far=(), expected_exam=None):
    problems = []
    try:
        if item.get("category") not in CARD_CATEGORIES:
            problems.append(f"category가 허용값이 아님: {item.get('category')}")
        fmt = item.get("format")
        if fmt not in CARD_FORMATS:
            problems.append(f"format이 허용된 형식이 아님: {fmt}")
        else:
            prev = [s.get("format") for s in list(recent_sets) + list(batch_so_far) if s.get("format") in rr.FORMATS]
            if prev and prev[-1] == fmt:
                problems.append(f"직전 카드뉴스와 같은 형식({fmt}) — 연속 사용 금지")
        for k in ("title", "hookAccent", "coverSub", "topic", "captionBody", "pinnedIntro"):
            if not isinstance(item.get(k), str) or not item[k].strip():
                problems.append(f"{k} 누락")
        items = item.get("items")
        if not (isinstance(items, list) and 3 <= len(items) <= 5 and all(
            isinstance(i, dict) and all(isinstance(i.get(k), str) and i[k].strip() for k in ("symbol", "label", "keyword", "desc")) for i in items
        )):
            problems.append("items는 3~5개, 각각 symbol/label/keyword/desc 문자열이어야 함")
        tags = item.get("hashtags")
        if not (isinstance(tags, list) and 5 <= len(tags) <= 6 and all(isinstance(t, str) and t.startswith("#") for t in tags) and "#사주" in tags and "#무료사주" in tags):
            problems.append("hashtags는 #으로 시작하는 5~6개, #사주와 #무료사주 필수")
        if not isinstance(item.get("keywords"), list) or not item["keywords"]:
            problems.append("keywords 누락")
        if problems:
            return problems

        n = rr.nospace_len
        if n(item["title"]) > BUDGET["title"]:
            problems.append(f"title이 너무 김(공백 제외 {BUDGET['title']}자 이내)")
        accent = item["hookAccent"].strip()
        if not (2 <= len(accent) <= 8 and accent in item["title"]):
            problems.append("hookAccent는 title 안에 그대로 들어있는 2~8자 어구여야 함")
        if re.search(r"(이유가 있(어요|대요|습니다)|알아볼게요|알려드릴게요|알아보겠습니다)\s*[.?!]?$", item["title"]) or re.search(r"(저는|제가) ", item["title"]):
            problems.append("title이 설명투로 끝나거나 제작자 시점임")
        if re.match(r"^\s*(안녕|여러분|오늘은|오늘 알아)", item["title"]):
            problems.append("title이 금지된 인사/설명형 시작임")
        if n(item["coverSub"]) > BUDGET["coverSub"]:
            problems.append(f"coverSub가 너무 김({BUDGET['coverSub']}자 이내)")
        if n(item["captionBody"]) > BUDGET["body"]:
            problems.append(f"captionBody가 너무 김({BUDGET['body']}자 이내)")
        for it in items:
            if len(it["symbol"]) > 3 or n(it["label"]) > BUDGET["label"] or n(it["keyword"]) > BUDGET["keyword"] or n(it["desc"]) > BUDGET["desc"]:
                problems.append(f"슬라이드 '{it['label']}'가 글자 수 예산 초과(label {BUDGET['label']}/keyword {BUDGET['keyword']}/desc {BUDGET['desc']}자, symbol 3자 이내)")
                break

        text_all = " ".join([item["title"], item["coverSub"], item["captionBody"], item["pinnedIntro"]] + [f"{i['label']} {i['keyword']} {i['desc']}" for i in items])
        hits = [w for w in rr.BANNED_WORDS if w in text_all]
        if hits:
            problems.append(f"금지 표현 포함: {hits}")
        for pattern, label in rr.REPEATED_PATTERNS:
            if pattern.search(text_all):
                problems.append(f"반복 금지 문장 구조 사용: {label}")
        for k in ("captionBody", "pinnedIntro"):
            if "댓글" in item[k]:
                problems.append(f"{k}에 '댓글'이 들어 있음(댓글 유도는 CTA가 담당)")
        problems += exam_season.validate_exam_fields(item, expected_exam, text_all)
        free_terms = rr.FREE_OK_TERMS + (["합격운"] if expected_exam else [])
        if "무료" in item["captionBody"] and not any(t in item["captionBody"] for t in free_terms):
            problems.append("captionBody의 '무료'가 무료 제공 4가지를 가리키지 않음")

        pool = [{"title": s.get("title"), "topic": s.get("topic")} for s in list(recent_sets)[-60:] + list(batch_so_far)]
        for p in pool:
            if rr._ratio(item["title"], p["title"]) > 0.75 or (p["topic"] and rr._ratio(item["topic"], p["topic"]) > 0.72):
                problems.append(f"최근/이번 배치 카드뉴스와 너무 비슷함: '{p['title']}'")
                break
    except Exception as e:
        problems.append(f"검증 중 오류: {e}")
    return problems


def build_caption(item, cta_type):
    caption = f"{item['captionBody'].strip()}\n\n{rr.CTAS[cta_type]['caption']}\n\n{' '.join(item['hashtags'])}"
    # 시험 시즌 편만 합격운 페이지 주소를 넣는다(일반 카드뉴스 캡션엔 아직 주소 없음).
    return rr.add_link_line(caption, exam_season.link_line(item["exam"], "ig_cardnews")) if item.get("exam") else caption


def build_pinned_comment(item):
    return rr.build_pinned_comment(item)
