import argparse
import glob
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
# publish_instagram.py(릴스용)와 같은 media-host 저장소/로컬 클론을 공유한다 — 캐러셀 이미지도
# 결국 raw.githubusercontent.com URL이 필요할 뿐이라 별도 저장소를 만들 필요는 없다.
RENDER_ROOT = os.environ.get("SAJU_RENDER_DIR", os.path.join(os.path.expanduser("~"), "SajuAutoRender"))
MEDIA_HOST_DIR = os.path.join(RENDER_ROOT, "media_host")
GITHUB_TOKEN_PATH = os.path.join(BASE_DIR, "credentials", "github_token.txt")
GITHUB_REPO = "dbswpvlf6190-alt/saju-media-host"


def run(cmd, cwd):
    # publish_instagram.py와 동일한 GCM 응답없는 인증창 멈춤 문제 예방 (2026-09-17).
    env = {**os.environ, "GIT_TERMINAL_PROMPT": "0", "GCM_INTERACTIVE": "Never"}
    result = subprocess.run(
        cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace",
        env=env, timeout=120,
    )
    if result.returncode != 0:
        raise RuntimeError(f"git 명령 실패: {' '.join(cmd)}\n{result.stdout}\n{result.stderr}")
    return result.stdout


def commit_and_push(add_paths, message):
    """같은 media_host를 노트북·데스크톱이 번갈아 쓰므로 push 전에 항상 최신을 받아 합친다
    (안 그러면 다른 컴퓨터가 먼저 올린 날 push가 fetch first로 거부돼 인스타 게시가 실패함,
    2026-09-21 노트북 38/39번 실제로 겪음). 이미 커밋된 같은 파일의 재시도는 커밋을 건너뛴다."""
    run(["git", "pull", "--no-rebase", "--no-edit", "origin", "main"], MEDIA_HOST_DIR)
    run(["git", "add", *add_paths], MEDIA_HOST_DIR)
    staged = subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=MEDIA_HOST_DIR).returncode != 0
    if staged:
        run(["git", "commit", "-m", message], MEDIA_HOST_DIR)
    try:
        run(["git", "push"], MEDIA_HOST_DIR)
    except RuntimeError:
        run(["git", "pull", "--no-rebase", "--no-edit", "origin", "main"], MEDIA_HOST_DIR)
        run(["git", "push"], MEDIA_HOST_DIR)


def to_jpg(png_path, out_dir):
    """Graph API 캐러셀 이미지는 JPEG를 요구하므로 PNG를 변환한다(ffmpeg는 릴스 파이프라인에서
    이미 쓰고 있어 별도 의존성 추가 없이 재사용)."""
    name = os.path.splitext(os.path.basename(png_path))[0] + ".jpg"
    out_path = os.path.join(out_dir, name)
    subprocess.run(
        ["ffmpeg", "-y", "-i", png_path, "-q:v", "2", out_path],
        check=True,
        capture_output=True,
    )
    return out_path


def push_images(image_paths, remote_prefix):
    urls = []
    remote_names = []
    for i, path in enumerate(image_paths):
        remote_name = f"{remote_prefix}_{i + 1:02d}.jpg"
        dest = os.path.join(MEDIA_HOST_DIR, remote_name)
        shutil.copy2(path, dest)
        remote_names.append(remote_name)
        urls.append(f"https://raw.githubusercontent.com/{GITHUB_REPO}/main/{remote_name}")

    with open(GITHUB_TOKEN_PATH, "r", encoding="utf-8") as f:
        token = f.read().strip()
    remote_url = f"https://{token}@github.com/{GITHUB_REPO}.git"
    run(["git", "remote", "set-url", "origin", remote_url], MEDIA_HOST_DIR)
    commit_and_push(remote_names, f"add {remote_prefix} ({len(remote_names)} slides)")

    return urls


def publish(image_dir, caption, remote_prefix):
    png_paths = sorted(glob.glob(os.path.join(image_dir, "*.png")))
    if not png_paths:
        raise SystemExit(f"{image_dir}에 png 파일이 없습니다.")

    tmp_jpg_dir = os.path.join(RENDER_ROOT, "tmp_jpg")
    os.makedirs(tmp_jpg_dir, exist_ok=True)
    print(f"1/3 PNG {len(png_paths)}장을 JPEG로 변환 중...")
    jpg_paths = [to_jpg(p, tmp_jpg_dir) for p in png_paths]

    print(f"2/3 깃허브에 이미지 업로드 중... ({remote_prefix}, {len(jpg_paths)}장)")
    urls = push_images(jpg_paths, remote_prefix)
    for u in urls:
        print(f"   {u}")
    time.sleep(8)

    print("3/3 인스타그램에 캐러셀 게시 중...")
    return instagram_upload.upload_carousel(urls, caption)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", required=True, help="슬라이드 png들이 들어있는 폴더 (파일명 순서대로 정렬됨)")
    ap.add_argument("--caption", required=True)
    ap.add_argument("--name", required=True, help="깃허브에 올릴 파일명 접두사 (예: saju_cardnews_01_C01)")
    args = ap.parse_args()
    publish(args.dir, args.caption, args.name)


if __name__ == "__main__":
    main()
