import argparse
import os
import shutil
import subprocess
import sys
import time

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

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
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace")
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
