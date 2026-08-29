import json
import os
import sys
from datetime import datetime, timezone

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import publish_carousel  # noqa: E402

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST_PATH = os.path.join(BASE_DIR, "scripts", "cardnews_manifest.json")
# run_daily.py(릴스용)와 같은 원칙: 게시 완료 기록은 저장소 밖(로컬 전용)에 남겨서 무인 실행이
# saju-app 저장소에 커밋을 만들지 않게 한다. 릴스와 폴더만 구분(posted_cardnews/)해서 서로 안 겹치게 한다.
RENDER_ROOT = os.environ.get("SAJU_RENDER_DIR", os.path.join(os.path.expanduser("~"), "SajuAutoRender"))
POSTED_DIR = os.path.join(RENDER_ROOT, "posted_cardnews")


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
    entries = load_manifest()
    next_entry = next((e for e in entries if not is_posted(e["day"])), None)

    if next_entry is None:
        print("모든 카드뉴스 대기열 항목이 이미 게시되었습니다. cardnews_manifest.json에 새 세트를 추가해주세요.")
        return

    print(f"카드뉴스 Day {next_entry['day']} ({next_entry['id']}, {next_entry['category']}) 게시 시작")
    dir_path = next_entry["dir"]
    if not os.path.isabs(dir_path):
        dir_path = os.path.join(BASE_DIR, dir_path)
    media_id = publish_carousel.publish(dir_path, next_entry["caption"], next_entry["remote_prefix"])
    mark_posted(next_entry["day"], next_entry, media_id)
    print(f"카드뉴스 Day {next_entry['day']} 게시 완료 (media_id={media_id})")


if __name__ == "__main__":
    main()
