import json
import os
import sys
from datetime import datetime, timezone

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import publish_instagram  # noqa: E402

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST_PATH = os.path.join(BASE_DIR, "scripts", "reel_manifest.json")
# 게시 완료 기록은 저장소 밖(로컬 전용)에 남긴다 — 매일 무인 실행되는 작업이 saju-app 저장소에
# 커밋을 만들지 않게 하기 위함이다(shorts_auto의 done.txt와 같은 역할이지만 git 밖에 둠).
RENDER_ROOT = os.environ.get("SAJU_RENDER_DIR", os.path.join(os.path.expanduser("~"), "SajuAutoRender"))
POSTED_DIR = os.path.join(RENDER_ROOT, "posted")


def load_manifest():
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def is_posted(day):
    return os.path.exists(os.path.join(POSTED_DIR, f"{day:02d}.json"))


def mark_posted(day, entry, media_id):
    os.makedirs(POSTED_DIR, exist_ok=True)
    with open(os.path.join(POSTED_DIR, f"{day:02d}.json"), "w", encoding="utf-8") as f:
        json.dump(
            {
                "day": day,
                "id": entry["id"],
                "media_id": media_id,
                "posted_at": datetime.now(timezone.utc).isoformat(),
            },
            f,
            ensure_ascii=False,
            indent=2,
        )


def main():
    # 하루 실행당 딱 1건만 게시한다 — Windows 작업 스케줄러가 매일 한 번 이 스크립트를 실행하면
    # 아직 안 올라간 것 중 순번이 가장 빠른 항목 하나를 자동으로 찾아서 올린다.
    entries = load_manifest()
    next_entry = next((e for e in entries if not is_posted(e["day"])), None)

    if next_entry is None:
        print("모든 대기열 항목이 이미 게시되었습니다. reel_manifest.json에 새 항목을 추가해주세요.")
        return

    print(f"Day {next_entry['day']} ({next_entry['id']}, {next_entry['category']}) 게시 시작")
    video_path = next_entry["video"]
    if not os.path.isabs(video_path):
        video_path = os.path.join(BASE_DIR, video_path)
    media_id = publish_instagram.publish(
        video_path, next_entry["caption"], next_entry["remote_name"]
    )
    mark_posted(next_entry["day"], next_entry, media_id)
    print(f"Day {next_entry['day']} 게시 완료 (media_id={media_id})")


if __name__ == "__main__":
    main()
