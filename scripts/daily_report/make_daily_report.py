# -*- coding: utf-8 -*-
"""사주랩·데일리 팩트랩 일일 운영 보고서(PDF) 생성기.
사용: python make_daily_report.py data_YYYY-MM-DD.json  → <바탕 화면>\\07_사주랩_인수인계\\일일보고서\\YYYY-MM-DD_일일보고서.pdf
데이터(JSON)는 수집 스크립트(또는 Claude)가 채우고, 이 파일은 모양만 책임진다. 값이 없으면 '확인 못 함'으로 표시한다."""
import json, os, sys
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, Frame, KeepTogether, PageTemplate, Paragraph, Spacer, Table, TableStyle)

pdfmetrics.registerFont(TTFont("KR", r"C:\Windows\Fonts\malgun.ttf"))
pdfmetrics.registerFont(TTFont("KRB", r"C:\Windows\Fonts\malgunbd.ttf"))

INK, MUTE, LINE = colors.HexColor("#1f2430"), colors.HexColor("#667085"), colors.HexColor("#d9dde5")
BRAND, SOFT = colors.HexColor("#5b3fc4"), colors.HexColor("#f3f0fc")
STATUS = {  # 상태 말 → (배경, 글자)
    "정상": (colors.HexColor("#e3f6ea"), colors.HexColor("#1b7a3d")),
    "진행": (colors.HexColor("#e5eefc"), colors.HexColor("#2457c5")),
    "주의": (colors.HexColor("#fff3d6"), colors.HexColor("#9a6400")),
    "문제": (colors.HexColor("#fde4e4"), colors.HexColor("#b42318")),
    "대기": (colors.HexColor("#eceff3"), colors.HexColor("#475467")),
    "미확인": (colors.HexColor("#eceff3"), colors.HexColor("#475467")),
}

S = {
    "title": ParagraphStyle("t", fontName="KRB", fontSize=20, leading=26, textColor=colors.white),
    "sub": ParagraphStyle("s", fontName="KR", fontSize=10, leading=14, textColor=colors.HexColor("#e4dcff")),
    "h1": ParagraphStyle("h1", fontName="KRB", fontSize=13, leading=18, textColor=BRAND, spaceBefore=12, spaceAfter=5),
    "h2": ParagraphStyle("h2", fontName="KRB", fontSize=10.5, leading=15, textColor=INK, spaceBefore=6, spaceAfter=3),
    "p": ParagraphStyle("p", fontName="KR", fontSize=9.5, leading=14, textColor=INK, spaceAfter=3),
    "small": ParagraphStyle("sm", fontName="KR", fontSize=8, leading=11, textColor=MUTE),
    "cell": ParagraphStyle("c", fontName="KR", fontSize=8.6, leading=12, textColor=INK),
    "cellb": ParagraphStyle("cb", fontName="KRB", fontSize=8.6, leading=12, textColor=INK),
    "head": ParagraphStyle("hd", fontName="KRB", fontSize=8.6, leading=12, textColor=colors.white),
    "bul": ParagraphStyle("b", fontName="KR", fontSize=9.3, leading=13.5, textColor=INK, leftIndent=10, bulletIndent=0, spaceAfter=1.5),
}


def P(text, st="p"):
    return Paragraph(str(text if text not in (None, "") else "확인 못 함"), S[st])


def table(rows, widths, head=True, status_col=None, zebra=True):
    data = []
    for r_i, row in enumerate(rows):
        out = []
        for c_i, cell in enumerate(row):
            if head and r_i == 0:
                out.append(Paragraph(str(cell), S["head"]))
            elif c_i == 0:
                out.append(Paragraph(str(cell), S["cellb"]))
            else:
                out.append(Paragraph(str(cell), S["cell"]))
        data.append(out)
    t = Table(data, colWidths=[w * mm for w in widths], repeatRows=1 if head else 0)
    style = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]
    if head:
        style += [("BACKGROUND", (0, 0), (-1, 0), BRAND)]
    if zebra:
        for i in range(1 if head else 0, len(rows)):
            if i % 2 == 0:
                style.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#fafbfc")))
    if status_col is not None:
        for i, row in enumerate(rows):
            if head and i == 0:
                continue
            bg, fg = STATUS.get(str(row[status_col]).strip(), STATUS["미확인"])
            style += [("BACKGROUND", (status_col, i), (status_col, i), bg)]
            data[i][status_col] = Paragraph(f'<font color="{fg.hexval().replace("0x", "#")}"><b>{row[status_col]}</b></font>', S["cell"])
    t.setStyle(TableStyle(style))
    return t


def bullets(items):
    return [Paragraph(f"• {i}", S["bul"]) for i in items]


def build(d, out_path):
    def header(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(BRAND)
        canvas.rect(0, A4[1] - 34 * mm, A4[0], 34 * mm, stroke=0, fill=1)
        canvas.setFillColor(colors.white)
        canvas.setFont("KRB", 19)
        canvas.drawString(18 * mm, A4[1] - 17 * mm, "일일 운영 보고서") if doc.page == 1 else None
        canvas.setFont("KR", 9.5)
        if doc.page == 1:
            canvas.setFillColor(colors.HexColor("#e4dcff"))
            canvas.drawString(18 * mm, A4[1] - 25 * mm, f"사주랩 · 데일리 팩트랩   |   {d['date_label']}   |   작성: Claude")
        canvas.restoreState()

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("KR", 8)
        canvas.setFillColor(MUTE)
        canvas.drawString(18 * mm, 10 * mm, f"사주랩·데일리 팩트랩 일일 보고서 · {d['date_label']}")
        canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"{doc.page}")
        canvas.restoreState()

    def first(canvas, doc):
        header(canvas, doc); footer(canvas, doc)

    def later(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(BRAND)
        canvas.rect(0, A4[1] - 8 * mm, A4[0], 8 * mm, stroke=0, fill=1)
        canvas.restoreState()
        footer(canvas, doc)

    doc = BaseDocTemplate(out_path, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=40 * mm, bottomMargin=16 * mm,
                          title=f"일일 운영 보고서 {d['date_label']}", author="Claude")
    f1 = Frame(18 * mm, 16 * mm, A4[0] - 36 * mm, A4[1] - 56 * mm, id="f1", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    f2 = Frame(18 * mm, 16 * mm, A4[0] - 36 * mm, A4[1] - 32 * mm, id="f2", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id="first", frames=[f1], onPage=first, autoNextPageTemplate="later"),
                          PageTemplate(id="later", frames=[f2], onPage=later)])
    W = A4[0] / mm - 36
    st = []

    st += [P("1. 한눈에 보기", "h1"), table([["영역", "오늘 상태", "평가"]] + d["overview"], [34, W - 34 - 18, 18], status_col=2)]
    if d.get("one_line"):
        st += [Spacer(1, 5), P(d["one_line"])]

    st += [P("2. 영상 콘텐츠", "h1"), P("2-1. 데일리 팩트랩 (유튜브 쇼츠)", "h2")]
    st += bullets(d["factlab"]["summary"])
    st += [Spacer(1, 3), table([["업로드(한국시각)", "제목", "조회", "좋아요"]] + d["factlab"]["recent"], [31, W - 31 - 16 - 16, 16, 16])]
    st += [Spacer(1, 3)] + bullets(d["factlab"]["insight"])
    st += [P("2-2. 사주랩 릴스 (인스타그램)", "h2")] + bullets(d["reels"]["summary"])
    st += [Spacer(1, 3), table([["회차", "주제", "조회", "평균 시청(초)"]] + d["reels"]["recent"], [18, W - 18 - 16 - 26, 16, 26])]
    st += [Spacer(1, 3)] + bullets(d["reels"]["insight"])

    st += [P("3. 쓰레드", "h1")] + bullets(d["threads"]["summary"])
    st += [Spacer(1, 3), table([["링크 실험", "링크 있을 때(10/7~11)", "링크 끈 뒤(8.9일)"]] + d["threads"]["linktest"], [44, 55, W - 99])]
    st += [Spacer(1, 3)] + bullets(d["threads"]["insight"])

    st += [P("4. 인스타그램", "h1")] + bullets(d["instagram"]["summary"])

    st += [P("5. 토스 미니앱 · 웹 결제", "h1")]
    st += [table([["항목", "내용"]] + d["toss"]["facts"], [38, W - 38])]
    st += [P("오늘 한 일과 해결한 문제", "h2"), table([["문제 / 작업", "원인 · 조치", "결과"]] + d["toss"]["problems"], [46, W - 46 - 22, 22], status_col=2)]

    st += [P("6. 앞으로의 계획", "h1"), table([["시기", "할 일", "담당"]] + d["plan"], [30, W - 30 - 20, 20])]
    st += [P("7. 결정이 필요한 것", "h1")] + bullets(d["decisions"])
    st += [P("8. 확인하지 못한 것 (보고서의 한계)", "h1")] + bullets(d["unknown"])
    doc.build(st)


if __name__ == "__main__":
    src = sys.argv[1]
    data = json.load(open(src, encoding="utf-8"))
    out_dir = os.path.join(os.path.expanduser("~"), "OneDrive", "바탕 화면", "사주랩_보고서")
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, f"{data['date']}_일일보고서.pdf")
    build(data, out)
    print(out)
