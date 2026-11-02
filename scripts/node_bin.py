"""스케줄러용 도구 경로. 작업 스케줄러는 로그온 이후에 바뀐 사용자 PATH를 못 물려받고 LOCALAPPDATA도
없을 수 있어, node·ffmpeg·ffprobe를 이름만으로 부르면 [WinError 2]로 실패한다
(2026-10-06 23:30·10-07 10:00 Threads 풀이 초안 실패, 10-07 20:01 릴스 자동 채우기의 영상 제작 실패).
이 모듈을 import하면 찾은 도구 폴더가 PATH 앞에 들어가 하위 프로세스(node의 execFileSync 포함)도 물려받는다."""
import glob
import os
import shutil


def _home_local():
    home = os.path.expanduser("~")
    return os.environ.get("LOCALAPPDATA") or os.path.join(home, "AppData", "Local")


def _find(exe, patterns):
    found = shutil.which(exe)
    if found:
        return found
    for pattern in patterns:
        hits = sorted(glob.glob(pattern))
        if hits:
            return hits[-1]
    return None


def find_node():
    local = _home_local()
    home = os.path.expanduser("~")
    return _find("node", [
        # 정식 설치(2026-10-08, winget OpenJS.NodeJS.LTS)를 가장 먼저 쓴다.
        r"C:\Program Files\nodejs\node.exe",
        os.path.join(local, "nodejs", "*", "node.exe"),
        os.path.join(home, "AppData", "Local", "nodejs", "*", "node.exe"),
        # 예비: Claude 데스크톱 앱이 설치한 node는 앱 패키지 저장소에 실제 파일이 있다. 앱 안에서는 AppData\Local\nodejs로 보이지만
        # 스케줄러 같은 일반 프로그램에는 그 경로가 없다(2026-10-08 Threads 풀이 초안 실패 원인).
        os.path.join(home, "AppData", "Local", "Packages", "Claude_*", "LocalCache", "Local", "nodejs", "*", "node.exe"),
    ]) or "node"


def find_ffmpeg_dir():
    local = _home_local()
    home = os.path.expanduser("~")
    path = _find("ffmpeg", [
        os.path.join(local, "Microsoft", "WinGet", "Packages", "Gyan.FFmpeg*", "ffmpeg-*", "bin", "ffmpeg.exe"),
        os.path.join(home, "AppData", "Local", "Microsoft", "WinGet", "Packages", "Gyan.FFmpeg*", "ffmpeg-*", "bin", "ffmpeg.exe"),
        r"C:\ffmpeg\bin\ffmpeg.exe",
    ])
    return os.path.dirname(path) if path else None


def ensure_tools_on_path():
    dirs = []
    node = find_node()
    if os.path.isabs(node):
        dirs.append(os.path.dirname(node))
    ff = find_ffmpeg_dir()
    if ff:
        dirs.append(ff)
    current = os.environ.get("PATH", "")
    missing = [d for d in dirs if d and d.lower() not in current.lower()]
    if missing:
        os.environ["PATH"] = os.pathsep.join(missing + [current]) if current else os.pathsep.join(missing)



def stay_awake_while_running():
    """작업이 도는 동안 컴퓨터가 다시 잠들지 않게 한다(이 프로세스가 끝나면 자동으로 풀림).
    작업 스케줄러가 절전 중인 노트북을 깨워도, 아무도 없으면 Windows가 약 14초 만에 다시 재워서 작업이 중간에 얼었다
    (2026-10-29·30 노트북: 08:01 깨어남 → 08:01:28 다시 절전, 쇼츠·Threads 락만 남기고 멈춤 → 두 컴퓨터 git 충돌로 이어짐).
    ES_CONTINUOUS | ES_SYSTEM_REQUIRED는 무인 기상 후 작업을 끝까지 돌리게 하는 Windows 표준 방법이다."""
    if os.name != "nt":
        return False
    try:
        import ctypes

        return bool(ctypes.windll.kernel32.SetThreadExecutionState(0x80000000 | 0x00000001))
    except Exception:
        return False


ensure_tools_on_path()
stay_awake_while_running()
