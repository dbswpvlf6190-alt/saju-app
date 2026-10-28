"""Claude Code 메모리를 두 컴퓨터(노트북·본가 데스크톱) 사이에 GitHub로 넘긴다.

메모리는 컴퓨터마다 따로(~/.claude/projects/<작업 폴더 슬러그>/memory) 저장되고 OneDrive·git에 없어서,
다른 컴퓨터의 Claude는 이쪽에서 정한 결정을 모른다. 그래서 docs/claude-memory/에 스냅샷을 두고 주고받는다.

  python scripts/claude_memory_sync.py export   # 떠나는 컴퓨터: 내 메모리 → docs/claude-memory (그다음 커밋·푸시)
  python scripts/claude_memory_sync.py import   # 도착한 컴퓨터: git pull 후 docs/claude-memory → 내 메모리
  (--dir <메모리 폴더>로 직접 지정 가능. 기본은 MEMORY.md가 있는 메모리 폴더 중 가장 최근에 바뀐 것)

import 규칙: 없는 파일은 추가, 같은 파일은 frontmatter `modified:`가 더 새로운 쪽만 덮어씀(날짜가 없거나 같으면 건드리지 않고 알림).
MEMORY.md는 덮어쓰지 않고 이쪽에 없는 줄만 덧붙인다. 비밀값은 메모리에 두지 않는 규칙이라 그대로 복사한다.
"""
import argparse
import glob
import os
import re
import shutil
import sys

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SNAPSHOT = os.path.join(BASE_DIR, "docs", "claude-memory")


def find_memory_dir():
    cands = [os.path.dirname(p) for p in glob.glob(os.path.join(os.path.expanduser("~"), ".claude", "projects", "*", "memory", "MEMORY.md"))]
    if not cands:
        return None
    return max(cands, key=lambda d: max(os.path.getmtime(os.path.join(d, f)) for f in os.listdir(d)))


def modified(path):
    with open(path, "r", encoding="utf-8") as f:
        m = re.search(r"^\s*modified:\s*(\S+)", f.read(), re.M)
    return m.group(1) if m else ""


def export(mem):
    os.makedirs(SNAPSHOT, exist_ok=True)
    n = 0
    for f in sorted(os.listdir(mem)):
        if f.endswith(".md"):
            shutil.copy2(os.path.join(mem, f), os.path.join(SNAPSHOT, f))
            n += 1
    print(f"내보냄 {n}개: {mem} → {SNAPSHOT}  (이제 커밋·푸시)")


def merge_index(src, dst):
    with open(src, "r", encoding="utf-8") as f:
        theirs = [l.rstrip("\n") for l in f]
    with open(dst, "r", encoding="utf-8") as f:
        mine = f.read()
    add = [l for l in theirs if l.startswith("- [") and l not in mine]
    if add:
        with open(dst, "a", encoding="utf-8") as f:
            f.write(("" if mine.endswith("\n") else "\n") + "\n".join(add) + "\n")
    return len(add)


def do_import(mem):
    if not os.path.isdir(SNAPSHOT):
        print("docs/claude-memory 스냅샷이 없음 — 먼저 git pull")
        return
    os.makedirs(mem, exist_ok=True)
    added, updated, kept = [], [], []
    for f in sorted(os.listdir(SNAPSHOT)):
        if not f.endswith(".md"):
            continue
        src, dst = os.path.join(SNAPSHOT, f), os.path.join(mem, f)
        if f == "MEMORY.md":
            if os.path.exists(dst):
                n = merge_index(src, dst)
                if n:
                    updated.append(f"MEMORY.md(+{n}줄)")
            else:
                shutil.copy2(src, dst)
                added.append(f)
            continue
        if not os.path.exists(dst):
            shutil.copy2(src, dst)
            added.append(f)
            continue
        with open(src, "rb") as a, open(dst, "rb") as b:
            if a.read() == b.read():
                continue
        ms, md = modified(src), modified(dst)
        if ms and md and ms > md:
            shutil.copy2(src, dst)
            updated.append(f)
        else:
            kept.append(f"{f}(이 컴퓨터 쪽 유지: 스냅샷 {ms or '날짜없음'} / 여기 {md or '날짜없음'})")
    print(f"메모리 폴더: {mem}")
    print(f"추가 {len(added)}: {', '.join(added) or '-'}")
    print(f"갱신 {len(updated)}: {', '.join(updated) or '-'}")
    if kept:
        print("확인 필요(덮어쓰지 않음): " + "; ".join(kept))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["export", "import"])
    ap.add_argument("--dir", help="메모리 폴더(기본: 자동 탐색)")
    args = ap.parse_args()
    mem = args.dir or find_memory_dir()
    if not mem:
        print("메모리 폴더를 찾지 못함 — --dir로 지정")
        sys.exit(1)
    export(mem) if args.mode == "export" else do_import(mem)


if __name__ == "__main__":
    main()
