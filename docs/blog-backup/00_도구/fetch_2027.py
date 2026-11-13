"""사주랩 /2027/<key> 페이지(운영 사이트)를 읽어 블로그 초안·이미지용 JSON으로 저장한다.

사용: python fetch_2027.py <key> <out.json>
  key = 띠 slug(jwi, so, horangi, tokki, yong, baem, mal, yang, wonsungi, dak, gae, dwaeji) 또는 출생연도(1940~2009)
읽기 전용(공개 페이지 GET만). 페이지 계산값을 그대로 옮겨 블로그와 사이트 숫자가 어긋나지 않게 한다.
"""
import json
import re
import sys
import urllib.request
from html.parser import HTMLParser

SITE = "https://saju-app-three-dusky.vercel.app"
VOID = {"br", "img", "meta", "link", "input", "hr", "source", "path"}


class Node:
    def __init__(self, tag, attrs, parent=None):
        self.tag, self.attrs, self.parent, self.children = tag, dict(attrs), parent, []

    def text(self):
        out = []
        for c in self.children:
            out.append(c if isinstance(c, str) else c.text())
        return re.sub(r"\s+", " ", "".join(out)).strip()

    def find_all(self, tag):
        res = []
        for c in self.children:
            if isinstance(c, Node):
                if c.tag == tag:
                    res.append(c)
                res.extend(c.find_all(tag))
        return res


class Builder(HTMLParser):
    def __init__(self):
        super().__init__()
        self.root = Node("root", [])
        self.cur = self.root

    def handle_starttag(self, tag, attrs):
        if tag == "br":
            self.cur.children.append(" ")
            return
        n = Node(tag, attrs, self.cur)
        self.cur.children.append(n)
        if tag not in VOID:
            self.cur = n

    def handle_endtag(self, tag):
        n = self.cur
        while n is not None and n.tag != tag:
            n = n.parent
        if n is not None and n.parent is not None:
            self.cur = n.parent

    def handle_data(self, data):
        if self.cur.tag not in ("script", "style"):
            self.cur.children.append(data)


def fetch(key):
    req = urllib.request.Request(f"{SITE}/2027/{key}", headers={"User-Agent": "sajulab-blog-draft"})
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8")
    b = Builder()
    b.feed(html)
    main = b.root.find_all("main")[0]
    h1 = main.find_all("h1")[0].text()
    header = main.find_all("header")[0]
    header_ps = [p.text() for p in header.find_all("p")]
    dts = [d.text() for d in main.find_all("dt")]
    dds = [d.text() for d in main.find_all("dd")]
    sections = []
    months = []
    for sec in main.find_all("section"):
        h2s = sec.find_all("h2")
        if not h2s:
            continue
        title = h2s[0].text()
        if "달별 흐름" in title:
            for li in sec.find_all("li"):
                spans = [s for s in li.children if isinstance(s, Node) and s.tag == "span"]
                head = spans[0] if spans else None
                strong = head.find_all("strong")[0].text() if head and head.find_all("strong") else ""
                label = [s.text() for s in head.children if isinstance(s, Node) and s.tag == "span"] if head else []
                m = re.match(r"(\d+)월", strong)
                months.append({
                    "month": int(m.group(1)) if m else None,
                    "name": strong,
                    "label": label[0] if label else "",
                    "line": spans[1].text() if len(spans) > 1 else "",
                    "note": spans[2].text() if len(spans) > 2 else "",
                })
            continue
        paras = [p.text() for p in sec.find_all("p")] + [li.text() for li in sec.find_all("li") if not li.find_all("a")]
        if title in ("한눈에 보기",):
            continue
        sections.append({"title": title, "paras": paras})
    summary = ""
    for c in main.children:
        if isinstance(c, Node) and c.tag == "p":
            summary = c.text()
            break
    return {
        "key": key,
        "url": f"{SITE}/2027/{key}",
        "title": h1,
        "subtitle": header_ps[0] if len(header_ps) > 1 else "",
        "headline": header_ps[-1].strip("“”\" ") if header_ps else "",
        "glance": list(zip(dts, dds)),
        "summary": summary,
        "sections": sections,
        "months": months,
    }


if __name__ == "__main__":
    data = fetch(sys.argv[1])
    with open(sys.argv[2], "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"ok {data['title']} | 달 {len(data['months'])}개 | 섹션 {len(data['sections'])}개")
