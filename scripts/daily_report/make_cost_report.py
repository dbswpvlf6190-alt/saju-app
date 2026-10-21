# -*- coding: utf-8 -*-
import os, sys
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Spacer
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_daily_report as R

W = A4[0] / mm - 36
DESK = os.path.join(os.path.expanduser("~"), "OneDrive", "바탕 화면", "사주랩_보고서")
os.makedirs(DESK, exist_ok=True)
OUT = os.path.join(DESK, "2026-10-20_나사용설명서_제작원가_분석.pdf")


def page(canvas, doc):
    canvas.saveState()
    if doc.page == 1:
        canvas.setFillColor(R.BRAND); canvas.rect(0, A4[1] - 34 * mm, A4[0], 34 * mm, stroke=0, fill=1)
        canvas.setFillColor(colors.white); canvas.setFont("KRB", 19); canvas.drawString(18 * mm, A4[1] - 17 * mm, "나 사용설명서 제작 원가 분석")
        canvas.setFont("KR", 9.5); canvas.setFillColor(colors.HexColor("#e4dcff"))
        canvas.drawString(18 * mm, A4[1] - 25 * mm, "사주랩   |   2026년 10월 20일 (화)   |   작성: Claude")
    else:
        canvas.setFillColor(R.BRAND); canvas.rect(0, A4[1] - 8 * mm, A4[0], 8 * mm, stroke=0, fill=1)
    canvas.setFont("KR", 8); canvas.setFillColor(R.MUTE)
    canvas.drawString(18 * mm, 10 * mm, "나 사용설명서 제작 원가 분석 · 2026-10-20"); canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, str(doc.page))
    canvas.restoreState()


doc = BaseDocTemplate(OUT, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=40 * mm, bottomMargin=16 * mm, title="나 사용설명서 제작 원가 분석", author="Claude")
f1 = Frame(18 * mm, 16 * mm, A4[0] - 36 * mm, A4[1] - 56 * mm, id="a", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
f2 = Frame(18 * mm, 16 * mm, A4[0] - 36 * mm, A4[1] - 32 * mm, id="b", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
doc.addPageTemplates([PageTemplate(id="first", frames=[f1], onPage=page, autoNextPageTemplate="later"), PageTemplate(id="later", frames=[f2], onPage=page)])

P, T, B = R.P, R.table, R.bullets
st = []
st += [P("1. 결론", "h1")]
st += B([
    "6장 1건을 만드는 AI 비용은 <b>약 175원</b>입니다(판매가 4,895원의 약 3.6%). 재시도를 감안하면 약 200원, 불리한 경우(같은 장 중복 생성)에도 약 350원 이하로 봅니다.",
    "건당 순수익은 <b>약 3,300~3,500원</b>입니다(정산 약 3,700원 - 생성비 약 200원, 환불 5% 반영).",
    "원가는 큰 문제가 아닙니다. 수익을 좌우하는 것은 생성비가 아니라 <b>구매 전환율</b>입니다.",
])
st += [P("2. 측정 방법", "h1")]
st += B([
    "서버가 실제로 보내는 요청(시스템 안내문 + 사주 사실 + 장별 지침)을 그대로 만들어, 무료 토큰 계산 기능으로 입력 토큰을 쟀습니다.",
    "출력은 실제 결제 테스트에서 생성된 6장 글(9,186자)의 토큰을 같은 방법으로 쟀습니다.",
    "모델은 코드가 쓰는 claude-sonnet-5(사고 기능 꺼짐), 단가는 입력 100만 토큰당 $2, 출력 $10(스킬 가격표 기준, 2026-10-06 기록), 환율 1,400원 가정입니다.",
])
st += [P("3. 장별 비용", "h1")]
rows = [["장", "입력 토큰", "출력 토큰", "글자 수", "비용(원)"],
        ["나의 기본 설계도", "2,426", "2,071", "1,893", "36"],
        ["내가 반복하는 선택", "2,154", "1,715", "1,580", "30"],
        ["사람 앞에서의 나", "2,049", "1,577", "1,489", "28"],
        ["일과 돈에서의 나", "2,044", "1,579", "1,446", "28"],
        ["지금 시기 사용법", "2,033", "2,066", "1,985", "35"],
        ["오늘부터 해볼 3가지", "1,962", "853", "793", "17"],
        ["합계", "12,668", "9,861", "9,186", "약 174"]]
st += [T(rows, [52, 28, 28, 24, W - 132])]
st += [Spacer(1, 4)] + B(["입력(약 1.3만 토큰)은 비용의 약 20%, 출력(약 1만 토큰)이 약 80%입니다. 출력은 글자 수에 비례하므로 분량을 줄이지 않는 한 크게 못 줄입니다."])

st += [P("4. 건당 손익", "h1")]
rows = [["항목", "금액", "비고"],
        ["판매가(VAT 포함)", "4,895원", "공급가 4,450원 + 부가세"],
        ["정산액(수수료 후)", "약 3,700원", "토스·앱마켓 수수료 약 20% 안팎, 범위 3,500~3,900원(추정, 과세 유형에 따라 다름)"],
        ["AI 생성비", "-약 200원", "기본 175원 + 재시도(검사 미달 시 1회 재생성) 약 15% 가정"],
        ["환불 5% 반영", "-약 175원", "환불률 가정(애플은 열람 후에도 승인 가능)"],
        ["건당 순수익", "약 3,300~3,500원", "서버·DB 비용은 현재 무료 한도 내(미확인)"]]
st += [T(rows, [38, 32, W - 70])]

st += [P("5. 비용이 더 늘 수 있는 부분 (확인 필요)", "h1")]
st += B([
    "<b>같은 장의 중복 생성:</b> 결제 직후 서버가 미리 6장을 만들고(웜업), 화면도 장별로 요청합니다. 두 요청이 거의 동시에 같은 장을 만들면 비용이 최대 2배가 될 수 있습니다. 실제로 중복되는지는 제가 확인하지 못했습니다.",
    "<b>재시도:</b> 금지어가 들어갔거나 분량이 목표의 65% 미만이면 그 장을 한 번 더 씁니다. 실제 비율은 측정하지 않았고 15%는 가정입니다.",
    "<b>환율·단가 변동:</b> 가격표와 환율이 바뀌면 같은 비율로 움직입니다.",
])
st += [P("6. 줄일 수 있는 방법", "h1")]
rows = [["방법", "절감 효과", "주의"],
        ["중복 생성 방지(미리 만든 결과를 화면이 기다렸다 사용)", "최대 약 175원/건(중복이 실제 있을 때)", "먼저 중복 여부를 측정해야 함"],
        ["더 저렴한 모델(claude-haiku-5-5, 입력 $0.10·출력 $0.50)", "건당 약 9원(약 95% 절감)", "글 품질이 같은지 비교 시험 필요, 현재는 비추천"],
        ["분량 목표 축소", "분량에 비례", "상품 가치가 줄어 전환율에 불리할 수 있음"]]
st += [T(rows, [66, 46, W - 112])]
st += B(["생성비가 판매가의 약 4%라서 지금은 절감 우선순위가 낮습니다. 구매가 늘어 월 수백 건이 되면 중복 방지부터 검토합니다."])

st += [P("7. 프로모션 손익분기 재계산", "h1")]
st += B([
    "건당 순수익 약 3,325원 기준으로 프로모션(5만 원, 광고 수익 약 3,000원 가정)의 손익분기는 <b>구매 약 15건(방문 1만 명 중 0.15%)</b>입니다. 이전 계산과 같습니다.",
    "원가는 손익분기를 거의 바꾸지 않습니다. 전환율이 핵심입니다.",
])
st += [P("8. 확인하지 못한 것", "h1")]
st += B([
    "실제 청구 금액(청구서)으로 검증하지 않았습니다. 토큰 수와 공개 단가로 계산한 값입니다.",
    "재시도 비율, 중복 생성 비율, 서버·DB 비용은 측정하지 않았습니다.",
    "정산액의 정확한 비율은 과세 유형과 결제 수단에 따라 달라 범위로 적었습니다.",
])
doc.build(st)
print(OUT)
