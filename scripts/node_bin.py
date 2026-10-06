"""node 실행 파일 경로. 스케줄러는 로그온 이후에 바뀐 사용자 PATH를 못 물려받아 'node'만으로는
[WinError 2]로 실패한다(2026-10-06 23:30 Threads 풀이 초안 실패)."""
import glob
import os
import shutil


def find_node():
    found = shutil.which("node")
    if found:
        return found
    for pattern in (
        os.path.join(os.environ.get("LOCALAPPDATA", ""), "nodejs", "*", "node.exe"),
        r"C:\Program Files\nodejs\node.exe",
    ):
        hits = sorted(glob.glob(pattern))
        if hits:
            return hits[-1]
    return "node"
