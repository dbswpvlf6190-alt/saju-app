"""fetch_2027.py가 만든 JSON으로 네이버 블로그용 이미지 4~5장을 만든다(사주랩 v16 색: 아이보리·남색·금색).

사용: python make_blog_images.py <data.json> <out_dir>
만드는 것: 1_대표.png, 2_한눈에.png, 3_달별흐름.png, 4_일돈사람.png, (출생연도 페이지면) 5_천간.png
글자는 전부 페이지 계산값 그대로 — 새 내용을 지어내지 않는다.
"""
import json
import os
import sys
from PIL import Image, ImageDraw, ImageFont

F = r"C:\Windows\Fonts"
SERIF = os.path.join(F, "batang.ttc")
SANS = os.path.join(F, "malgun.ttf")
SANSB = os.path.join(F, "malgunbd.ttf")
BG, INK, MUTED, GOLD, GOLDS, ROW, CARE = "#f5f1ea", "#1b1828", "#5e5869", "#b8955a", "#7a5a1f", "#efe8dc", "#a33b2b"
TONE = {"좋은 달": GOLDS, "조심할 달": CARE, "내 띠의 달": GOLDS, "가볍게 조심": MUTED, "보통": MUTED}
FOOT = "사주랩 운세연구소"


def font(path, size):
    return ImageFont.truetype(path, size)


def canvas(w, h):
    im = Image.new("RGB", (w, h), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([30, 30, w - 30, h - 30], outline=GOLD, width=3)
    return im, d


def center(d, w, text, f, y, fill):
    tw = d.textbbox((0, 0), text, font=f)[2]
    d.text(((w - tw) / 2, y), text, font=f, fill=fill)


def wrap(d, text, f, max_w):
    lines, cur = [], ""
    for word in text.split(" "):
        test = (cur + " " + word).strip()
        if d.textbbox((0, 0), test, font=f)[2] <= max_w:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def title_parts(title):
    # "1963년생 토끼띠 2027년 운세" → ("1963년생 토끼띠", "2027년 운세")
    if "2027년 운세" in title:
        head = title.replace("2027년 운세", "").strip()
        return head, "2027년 운세"
    return title, ""


def main(data_path, out):
    data = json.load(open(data_path, encoding="utf-8"))
    os.makedirs(out, exist_ok=True)
    head, tail = title_parts(data["title"])

    # 1. 대표
    im, d = canvas(1080, 1080)
    center(d, 1080, "2027 丁未年 · 붉은 양의 해", font(SANS, 38), 300, GOLDS)
    center(d, 1080, head, font(SERIF, 96 if len(head) <= 8 else 80), 380, INK)
    center(d, 1080, tail, font(SERIF, 96), 510, INK)
    d.line([(420, 655), (660, 655)], fill=GOLD, width=3)
    for i, line in enumerate(wrap(d, data["headline"], font(SANS, 44), 860)):
        center(d, 1080, line, font(SANS, 44), 690 + i * 60, MUTED)
    center(d, 1080, FOOT, font(SANSB, 32), 965, GOLDS)
    im.save(os.path.join(out, "1_대표.png"))

    # 2. 한눈에 보기
    im, d = canvas(1080, 1080)
    center(d, 1080, "한눈에 보기", font(SERIF, 72), 150, INK)
    if data.get("subtitle"):
        center(d, 1080, data["subtitle"], font(SANS, 34), 255, MUTED)
    y = 340
    for i, (k, v) in enumerate(data["glance"]):
        if i % 2 == 0:
            d.rectangle([90, y - 14, 990, y + 96], fill=ROW)
        d.text((130, y + 18), k, font=font(SANS, 40), fill=MUTED)
        col = CARE if k == "조심할 달" else (GOLDS if k == "좋은 달" else INK)
        d.text((400, y + 14), v, font=font(SANSB, 44), fill=col)
        y += 120
    center(d, 1080, "띠는 사주 여덟 글자 중 한 글자예요", font(SANS, 32), 880, MUTED)
    center(d, 1080, FOOT, font(SANSB, 32), 965, GOLDS)
    im.save(os.path.join(out, "2_한눈에.png"))

    # 3. 달별 흐름
    W, H = 1080, 1480
    im, d = canvas(W, H)
    center(d, W, f"{head} 2027년 달별 흐름", font(SERIF, 50), 80, INK)
    y = 190
    for i, m in enumerate(data["months"]):
        if i % 2 == 0:
            d.rectangle([60, y - 10, W - 60, y + 80], fill=ROW)
        d.text((100, y + 12), m["name"].replace(" · ", "  "), font=font(SANSB, 40), fill=INK)
        lab = m["label"]
        lw = d.textbbox((0, 0), lab, font=font(SANSB, 40))[2]
        d.text((W - 100 - lw, y + 12), lab, font=font(SANSB, 40), fill=TONE.get(lab, MUTED))
        y += 96
    center(d, W, "조심할 달은 큰 결정을 한 번 더 확인하자는 뜻이에요", font(SANS, 30), H - 150, MUTED)
    center(d, W, FOOT, font(SANSB, 30), H - 100, GOLDS)
    im.save(os.path.join(out, "3_달별흐름.png"))

    # 4. 일 · 돈 · 사람
    sec = next((s for s in data["sections"] if s["title"].startswith("일")), None)
    if sec:
        im, d = canvas(1080, 1080)
        center(d, 1080, "일 · 돈 · 사람", font(SERIF, 72), 130, INK)
        y = 270
        for p in sec["paras"][:3]:
            key, _, body = p.partition("—")
            d.text((110, y), key.strip(), font=font(SANSB, 46), fill=GOLDS)
            for j, line in enumerate(wrap(d, body.strip(), font(SANS, 38), 760)):
                d.text((230, y + j * 54), line, font=font(SANS, 38), fill=INK)
            y += 200
        center(d, 1080, FOOT, font(SANSB, 32), 965, GOLDS)
        im.save(os.path.join(out, "4_일돈사람.png"))

    # 5. 천간(출생연도 페이지만)
    stem = next((s for s in data["sections"] if "년생으로 보면" in s["title"]), None)
    if stem:
        im, d = canvas(1080, 1080)
        t = stem["title"].split("—")[-1].strip()
        for j, line in enumerate(wrap(d, t, font(SERIF, 56), 880)):
            center(d, 1080, line, font(SERIF, 56), 200 + j * 76, INK)
        y = 200 + 76 * (j + 1) + 50
        for line in wrap(d, stem["paras"][0], font(SANS, 38), 860):
            center(d, 1080, line, font(SANS, 38), y, MUTED)
            y += 58
        center(d, 1080, stem["title"].split("—")[0].strip(), font(SANSB, 34), 880, GOLDS)
        center(d, 1080, FOOT, font(SANSB, 32), 965, GOLDS)
        im.save(os.path.join(out, "5_천간.png"))
    print("images ok:", sorted(os.listdir(out)))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
