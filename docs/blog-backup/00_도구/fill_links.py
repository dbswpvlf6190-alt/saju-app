"""블로그 초안에 내 블로그 글 주소를 채워 '바로 복사용' 파일을 만든다.

공개 저장소라 블로그 주소(아이디 포함)는 초안에 넣지 않고 [[주소:제목 일부]] 자리표시만 둔다.
이 스크립트가 OneDrive '사주랩 블로그 글 주소.txt'(바탕화면 아님, OneDrive 맨 위)를 RSS로 새로 고친 뒤,
자리표시를 실제 주소로 바꾼 '★바로복사_...txt'를 같은 폴더에 만든다(.gitignore로 저장소에는 안 올라감).

사용법:  python fill_links.py <날짜 폴더>        예) python fill_links.py ..\\2026-11-18
"""
import glob
import os
import re
import sys
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")

ONEDRIVE = os.path.join(os.path.expanduser("~"), "OneDrive")
ADDR = os.path.join(ONEDRIVE, "사주랩 블로그 글 주소.txt")
# 주소 파일이 없을 때 블로그 아이디를 읽어 올 바탕화면 바로가기(아이디를 코드에 두지 않기 위해)
SHORTCUT = os.path.join(ONEDRIVE, "바탕 화면", "사주랩 운세연구소 블로그.url")
TOKEN = re.compile(r"\[\[주소:([^\]]+)\]\]")
PREFIX = "★바로복사_"


def read_addr():
    if not os.path.exists(ADDR):
        return []
    lines = [l.strip() for l in open(ADDR, encoding="utf-8").read().splitlines()]
    pairs = []
    for i, l in enumerate(lines[:-1]):
        if lines[i + 1].startswith("https://blog.naver.com/"):
            pairs.append((l, lines[i + 1]))
    return pairs


def refresh_addr():
    """주소 파일에 이미 있는 주소에서 블로그 아이디를 읽어 RSS로 목록을 새로 고친다(아이디를 코드에 두지 않음)."""
    try:
        old = read_addr()
        m = re.match(r"https://blog\.naver\.com/([^/]+)/", old[0][1]) if old else None
        if not m and os.path.exists(SHORTCUT):
            m = re.search(r"URL=https://blog\.naver\.com/([A-Za-z0-9_\-]+)", open(SHORTCUT, encoding="utf-8", errors="ignore").read())
        if not m:
            print("블로그 아이디를 찾지 못함(주소 파일·바로가기 둘 다 없음)")
            return
        x = urllib.request.urlopen(f"https://rss.blog.naver.com/{m.group(1)}.xml", timeout=20).read().decode("utf-8")
        clean = lambda v: v.replace("<![CDATA[", "").replace("]]>", "").strip()
        items = [(clean(t), clean(l).split("?")[0]) for t, l in re.findall(r"<item>.*?<title>(.*?)</title>.*?<link>(.*?)</link>", x, re.S)]
        known = {u for _, u in items}
        items += [p for p in old if p[1] not in known]  # RSS에서 밀려난 옛 글도 유지
        hub = [i for i in items if "총정리" in i[0]]
        rest = [i for i in items if "총정리" not in i[0] and "2027" in i[0]]
        out = ["사주랩 블로그 글 주소 (fill_links.py가 RSS로 새로 고침)", "올린 글은 고치지 않아요. 새 글에만 넣어요.", "", "[총정리 글]", ""]
        for t, l in hub:
            out += [t, l, ""]
        out += ["[띠별 글]", ""]
        for t, l in rest:
            out += [t, l, ""]
        open(ADDR, "w", encoding="utf-8").write("\n".join(out))
    except Exception as e:  # 인터넷이 안 돼도 기존 주소 파일로 진행
        print("RSS 새로 고침 건너뜀:", e)


def main(folder):
    refresh_addr()
    pairs = read_addr()
    made = 0
    for f in sorted(glob.glob(os.path.join(folder, "*.txt"))):
        name = os.path.basename(f)
        if name.startswith(PREFIX) or name.endswith("_올릴_순서.txt"):
            continue
        s = open(f, encoding="utf-8").read()
        missing = []

        def sub(m):
            key = m.group(1).strip()
            for t, u in pairs:
                if key in t:
                    return u
            missing.append(key)
            return m.group(0)

        t = TOKEN.sub(sub, s)
        t = re.sub(r"^\[링크\].*\n(?:  .*\n)*", "", t, flags=re.M)  # 붙여 넣기 안내 줄은 복사본에서 뺀다
        open(os.path.join(folder, PREFIX + name), "w", encoding="utf-8").write(t)
        made += 1
        print(("주소 못 찾음 " + ", ".join(missing) + " | ") if missing else "ok | ", PREFIX + name)
    print(f"{made}개 만듦")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
