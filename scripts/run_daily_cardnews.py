import json
import os
import sys
from datetime import datetime, timezone

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import publish_carousel  # noqa: E402
import git_sync  # noqa: E402

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST_PATH = os.path.join(BASE_DIR, "scripts", "cardnews_manifest.json")
# run_daily.py(릴스용)와 같은 원칙: 게시 완료 기록을 저장소 안(git 추적)에 남겨서 노트북·
# 데스크톱이 서로의 게시 여부를 공유한다. 릴스와는 폴더만 구분(cardnews/)해서 안 겹치게 한다.
POSTED_DIR = os.path.join(BASE_DIR, "scripts", "posted_state", "cardnews")


def load_manifest():
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def posted_path(day):
    return os.path.join(POSTED_DIR, f"{day:02d}.json")


def is_posted(day):
    return os.path.exists(posted_path(day))


def mark_posted(day, entry, media_id):
    os.makedirs(POSTED_DIR, exist_ok=True)
    with open(posted_path(day), "w", encoding="utf-8") as f:
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
    rel_path = os.path.relpath(posted_path(day), BASE_DIR)
    git_sync.git_commit_push(BASE_DIR, [rel_path], f"posted: cardnews day {day}")


def main():
    # 주의(2026-09-03 실제로 겪음): Windows 작업 스케줄러 트리거에 반복(Repetition/재시도)을 걸면
    # 실행될 때마다 다음 미게시 항목을 계속 찾아 올려서 한 창(예: 4시간) 안에 여러 건이 연달아
    # 게시돼버림(하루에 3건 나간 사고 있었음) — 절대 반복 트리거 걸지 말 것. run_daily.py 참고.
    git_sync.git_pull(BASE_DIR)
    entries = load_manifest()
    next_entry = next((e for e in entries if not is_posted(e["day"])), None)

    if next_entry is None:
        print("모든 카드뉴스 대기열 항목이 이미 게시되었습니다. cardnews_manifest.json에 새 세트를 추가해주세요.")
        return

    day = next_entry["day"]
    lock_rel = os.path.relpath(os.path.join(POSTED_DIR, f"{day:02d}.lock"), BASE_DIR)
    acquired, holder = git_sync.try_acquire_lock(BASE_DIR, lock_rel)
    if not acquired:
        print(f"카드뉴스 Day {day}는 다른 컴퓨터({holder})가 이미 처리 중인 것으로 보입니다. 건너뜁니다.")
        return

    try:
        git_sync.git_pull(BASE_DIR)
        if is_posted(day):
            print(f"카드뉴스 Day {day}는 다른 컴퓨터가 먼저 게시를 완료했습니다. 건너뜁니다.")
            return

        print(f"카드뉴스 Day {day} ({next_entry['id']}, {next_entry['category']}) 게시 시작")
        dir_path = next_entry["dir"]
        if not os.path.isabs(dir_path):
            dir_path = os.path.join(BASE_DIR, dir_path)
        media_id = publish_carousel.publish(dir_path, next_entry["caption"], next_entry["remote_prefix"])
        mark_posted(day, next_entry, media_id)
        print(f"카드뉴스 Day {day} 게시 완료 (media_id={media_id})")
    finally:
        git_sync.release_lock(BASE_DIR, lock_rel)


if __name__ == "__main__":
    main()
