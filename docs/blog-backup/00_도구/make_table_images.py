"""블로그용 표 사진·총정리 대표 사진을 만든다(11/18~ 새 구조: 표는 사진으로 넣어 사장님이 붙여넣기 없이 사진만 넣게).

사용: python make_table_images.py <spec.json>
spec = {"out": "<이미지 폴더>",
        "cover": {"file": "1_대표.png", "top": "2027 丁未年 · 붉은 양의 해", "lines": ["2027년", "이사하기 좋은 달"], "sub": "띠별 총정리"},   (선택)
        "tables": [{"file": "5_표1.png", "title": "...", "head": ["띠", ["출생년도", 5]], "rows": [["쥐띠", "..."], ...]}]}
head 칸에 [글자, 칸 수]를 쓰면 여러 칸을 합친다. '좋은 달'·'조심할 달' 글자는 색을 입힌다.
"""
import json
import os
import sys
from PIL import Image, ImageDraw, ImageFont

F = r"C:\Windows\Fonts"
SANS = ImageFont.truetype(os.path.join(F, "malgun.ttf"), 30)
BOLD = ImageFont.truetype(os.path.join(F, "malgunbd.ttf"), 30)
TITLE = ImageFont.truetype(os.path.join(F, "batang.ttc"), 44)
BG, INK, MUTED, GOLD, GOLDS, HEAD, LINE, CARE = "#f5f1ea", "#1b1828", "#5e5869", "#b8955a", "#7a5a1f", "#e9dfcc", "#cdbf9f", "#a33b2b"
FOOT = "사주랩 운세연구소"


def color(t):
    if "조심" in t and "가볍게" not in t:
        return CARE
    if t in ("좋은 달", "내 띠의 달"):
        return GOLDS
    return INK


def table(spec, path):
    head = [(h, 1) if isinstance(h, str) else (h[0], h[1]) for h in spec["head"]]
    rows = [[(c, 1) for c in r] for r in spec["rows"]]
    ncol = sum(s for _, s in head)
    tmp = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    w = [0] * ncol
    for r in rows + [head]:
        c = 0
        for t, s in r:
            if s == 1:
                w[c] = max(w[c], tmp.textbbox((0, 0), t, font=BOLD)[2] + 40)
            c += s
    W = max(1000, sum(w) + 120)
    w = [x * (W - 120) / sum(w) for x in w]
    RH = 62
    H = 150 + RH * (len(rows) + 1) + 90
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([20, 20, W - 20, H - 20], outline=GOLD, width=3)
    tw = d.textbbox((0, 0), spec["title"], font=TITLE)[2]
    d.text(((W - tw) / 2, 55), spec["title"], font=TITLE, fill=INK)
    y = 140
    for i, r in enumerate([head] + rows):
        x, c = 60, 0
        for t, s in r:
            cw = sum(w[c:c + s])
            d.rectangle([x, y, x + cw, y + RH], fill=HEAD if i == 0 else BG, outline=LINE, width=2)
            fnt = BOLD if (i == 0 or c == 0) else SANS
            bb = d.textbbox((0, 0), t, font=fnt)
            d.text((x + (cw - bb[2]) / 2, y + (RH - bb[3]) / 2 - 2), t, font=fnt, fill=INK if i == 0 else color(t))
            x += cw
            c += s
        y += RH
    fw = d.textbbox((0, 0), FOOT, font=SANS)[2]
    d.text(((W - fw) / 2, H - 80), FOOT, font=SANS, fill=GOLDS)
    im.save(path)


def cover(spec, path):
    S = 1080
    im = Image.new("RGB", (S, S), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([30, 30, S - 30, S - 30], outline=GOLD, width=3)

    def c(text, f, y, fill):
        tw = d.textbbox((0, 0), text, font=f)[2]
        d.text(((S - tw) / 2, y), text, font=f, fill=fill)

    c(spec.get("top", "2027 丁未年 · 붉은 양의 해"), ImageFont.truetype(os.path.join(F, "malgun.ttf"), 38), 290, GOLDS)
    big = ImageFont.truetype(os.path.join(F, "batang.ttc"), 88)
    y = 370
    for line in spec["lines"]:
        c(line, big, y, INK)
        y += 125
    d.line([(420, y + 20), (660, y + 20)], fill=GOLD, width=3)
    if spec.get("sub"):
        c(spec["sub"], ImageFont.truetype(os.path.join(F, "malgun.ttf"), 44), y + 55, MUTED)
    c(FOOT, ImageFont.truetype(os.path.join(F, "malgunbd.ttf"), 32), 965, GOLDS)
    im.save(path)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    os.makedirs(spec["out"], exist_ok=True)
    if spec.get("cover"):
        cover(spec["cover"], os.path.join(spec["out"], spec["cover"]["file"]))
        print("ok", spec["cover"]["file"])
    for t in spec.get("tables", []):
        table(t, os.path.join(spec["out"], t["file"]))
        print("ok", t["file"])
