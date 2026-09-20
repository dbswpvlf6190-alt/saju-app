import json
import os
import sys
from datetime import datetime, timezone

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import publish_carousel  # noqa: E402
import git_sync  # noqa: E402
import refill_queue  # noqa: E402

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST_PATH = os.path.join(BASE_DIR, "scripts", "cardnews_manifest.json")
# run_daily.py(릴스용)와 같은 원칙: 게시 완료 기록을 저장소 안(git 추적)에 남겨서 노트북·
# 데스크톱이 서로의 게시 여부를 공유한다. 릴스와는 폴더만 구분(cardnews/)해서 안 겹치게 한다.
POSTED_DIR = os.path.join(BASE_DIR, "scripts", "posted_state", "cardnews")
MIN_HOURS_BETWEEN_POSTS = 60  # 약 3일에 1회(주 2~3회). 11:00 실행 기준 48시간은 건너뛰고 72시간은 통과


def load_manifest():
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def posted_path(day):
    return os.path.join(POSTED_DIR, f"{day:02d}.json")


def is_posted(day):
    return os.path.exists(posted_path(day))


def last_posted_at():
    """git으로 공유되는 게시 기록(posted_at) 중 가장 최근 시각. 노트북이 올린 것도 포함된다."""
    latest = None
    for name in os.listdir(POSTED_DIR) if os.path.isdir(POSTED_DIR) else []:
        if not name.endswith(".json"):
            continue
        try:
            with open(os.path.join(POSTED_DIR, name), "r", encoding="utf-8") as f:
                ts = datetime.fromisoformat(json.load(f)["posted_at"])
        except (OSError, ValueError, KeyError):
            continue
        if latest is None or ts > latest:
            latest = ts
    return latest


def mark_posted(day, entry, media_id):
    os.makedirs(POSTED_DIR, exist_ok=True)
    record = {
        "day": day,
        "id": entry["id"],
        "media_id": media_id,
        "posted_at": datetime.now(timezone.utc).isoformat(),
    }
    if entry.get("pinned_comment"):
        record["pinned_comment"] = entry["pinned_comment"]
    if entry.get("cta_type"):
        record["cta_type"] = entry["cta_type"]
    with open(posted_path(day), "w", encoding="utf-8") as f:
        json.dump(record, f, ensure_ascii=False, indent=2)
    rel_path = os.path.relpath(posted_path(day), BASE_DIR)
    git_sync.git_commit_push(BASE_DIR, [rel_path], f"posted: cardnews day {day}")


def main():
    # 주의(2026-09-03 실제로 겪음): Windows 작업 스케줄러 트리거에 반복(Repetition/재시도)을 걸면
    # 실행될 때마다 다음 미게시 항목을 계속 찾아 올려서 한 창(예: 4시간) 안에 여러 건이 연달아
    # 게시돼버림(하루에 3건 나간 사고 있었음) — 절대 반복 트리거 걸지 말 것. run_daily.py 참고.
    git_sync.git_pull(BASE_DIR)
    # 2026-09-20 실험: 카드뉴스 도달이 2 수준이라 게시 빈도를 주 2~3회로 줄인다. 작업 스케줄러 트리거는
    # 매일 그대로 두고 여기서 최소 간격으로 걸러낸다 — 게시 기록이 git으로 공유되니 노트북에서도 똑같이 적용되고,
    # 예정 시각에 PC가 꺼져 있었다가 늦게 실행돼도(StartWhenAvailable) 간격만 지났으면 그날 올라간다.
    last = last_posted_at()
    if last is not None:
        hours = (datetime.now(timezone.utc) - last).total_seconds() / 3600
        if hours < MIN_HOURS_BETWEEN_POSTS:
            print(f"마지막 카드뉴스 게시 후 {hours:.0f}시간 경과(최소 {MIN_HOURS_BETWEEN_POSTS}시간) — 오늘은 건너뜁니다.")
            return
    try:
        refill_queue.ensure_cardnews_buffer()
    except Exception as e:
        print(f"자동 채우기 실패(무시하고 계속): {e}")
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
        if next_entry.get("pinned_comment"):
            print("---- 고정댓글(인스타에서 직접 댓글 달고 고정해주세요) ----")
            print(next_entry["pinned_comment"])
            try:
                render_root = os.environ.get("SAJU_RENDER_DIR", os.path.join(os.path.expanduser("~"), "SajuAutoRender"))
                os.makedirs(render_root, exist_ok=True)
                with open(os.path.join(render_root, "pinned_comment_cardnews_latest.txt"), "w", encoding="utf-8") as pf:
                    pf.write(f"카드뉴스 Day {day} ({next_entry['id']}) 고정댓글 — 인스타에서 이 문구로 댓글 달고 고정하세요\n\n{next_entry['pinned_comment']}\n")
            except OSError as e:
                print(f"고정댓글 파일 저장 실패(무시): {e}")
    finally:
        git_sync.release_lock(BASE_DIR, lock_rel)


if __name__ == "__main__":
    main()
