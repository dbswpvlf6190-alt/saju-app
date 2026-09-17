import argparse
import os
import shutil
import subprocess
import sys
import time

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr.encoding and sys.stderr.encoding.lower() != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import instagram_upload  # noqa: E402

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# shorts_auto와 완전히 분리된 전용 영상 호스팅 저장소. daily.factlab 쪽
# (dbswpvlf6190-alt/shorts-media-host)과 절대 안 섞이도록 별도 repo를 쓴다.
# git 폴더가 OneDrive 동기화 대상이면 손상 위험이 있어(shorts_auto에서 실제로 겪음)
# 로컬 전용 경로를 쓴다.
RENDER_ROOT = os.environ.get("SAJU_RENDER_DIR", os.path.join(os.path.expanduser("~"), "SajuAutoRender"))
MEDIA_HOST_DIR = os.path.join(RENDER_ROOT, "media_host")
GITHUB_TOKEN_PATH = os.path.join(BASE_DIR, "credentials", "github_token.txt")
GITHUB_REPO = "dbswpvlf6190-alt/saju-media-host"  # TODO: 사용자 승인 후 새로 생성 필요 (아직 없음)


def run(cmd, cwd):
    # GCM(Git Credential Manager)이 데스크톱 세션 없는 Task Scheduler 환경에서 응답 없는
    # 인증창을 띄우려다 몇 시간씩(심지어 하루 이상) 멈추는 문제가 실제로 발생함
    # (2026-09-16 20:00 reel 16 처리가 그대로 멈춰서 Task Scheduler에 강제 종료당함,
    # shorts_auto 쪽 media_host push에서도 동일 증상 확인됨, 2026-09-17). URL에 토큰이
    # 이미 포함돼 있어 credential helper가 끼어들 필요가 없으므로 프롬프트 자체를
    # 차단하고, 그래도 멈추면 짧은 timeout으로 빨리 실패하게 함.
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0", "GCM_INTERACTIVE": "Never"}
    result = subprocess.run(
        cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace",
        env=env, timeout=120,
    )
    if result.returncode != 0:
        raise RuntimeError(f"git 명령 실패: {' '.join(cmd)}\n{result.stdout}\n{result.stderr}")
    return result.stdout


def push_video(video_path, remote_name):
    dest = os.path.join(MEDIA_HOST_DIR, remote_name)
    shutil.copy2(video_path, dest)

    with open(GITHUB_TOKEN_PATH, "r", encoding="utf-8") as f:
        token = f.read().strip()
    remote_url = f"https://{token}@github.com/{GITHUB_REPO}.git"
    run(["git", "remote", "set-url", "origin", remote_url], MEDIA_HOST_DIR)
    run(["git", "add", remote_name], MEDIA_HOST_DIR)
    run(["git", "commit", "-m", f"add {remote_name}"], MEDIA_HOST_DIR)
    run(["git", "push"], MEDIA_HOST_DIR)

    return f"https://raw.githubusercontent.com/{GITHUB_REPO}/main/{remote_name}"


def publish(video_path, caption, remote_name):
    print(f"1/2 깃허브에 영상 업로드 중... ({remote_name})")
    url = push_video(video_path, remote_name)
    print(f"   URL: {url}")
    time.sleep(8)
    print("2/2 인스타그램에 게시 중...")
    return instagram_upload.upload_reel(url, caption)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", required=True)
    ap.add_argument("--caption", required=True)
    ap.add_argument("--name", required=True, help="깃허브에 올릴 파일명 (예: saju_01_R25.mp4)")
    args = ap.parse_args()
    publish(args.video, args.caption, args.name)


if __name__ == "__main__":
    main()
