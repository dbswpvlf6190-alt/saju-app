"""Threads 하루 1개 자동 게시 — scripts/threads_queue.json 에서 아직 안 올린 첫 글을 올리고,
바로 내 글에 링크 댓글을 단다(본문에 외부 링크가 있으면 노출이 줄어드는 편이라 링크는 댓글로만).

작업 스케줄러: SajuThreadsDaily 매일 21:00, StartWhenAvailable. run_daily.py와 같은 이유로 반복 트리거 절대 금지.
게시 기록은 scripts/posted_state/threads/<id>.json(git 추적)이라 노트북·데스크톱이 공유한다.
"""
import json
import os
import sys
from datetime import datetime, timezone

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import git_sync  # noqa: E402
import notify  # noqa: E402
import threads_api  # noqa: E402

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUEUE_PATH = os.path.join(BASE_DIR, "scripts", "threads_queue.json")
# "생일 적어주면 무료로 알려줄게" 글. 9/26 첫 글이 하룻밤 조회 1,988·답글 46으로 설명형 원고(64~344)를 압도해서
# 사흘에 한 번은 대기열 대신 이 글을 올린다. 답글 풀이는 threads_replies.py(auto → 승인 → send).
READING_PATH = os.path.join(BASE_DIR, "scripts", "threads_reading_posts.json")
READING_EVERY_DAYS = 3
POSTED_DIR = os.path.join(BASE_DIR, "scripts", "posted_state", "threads")
MIN_HOURS_BETWEEN_POSTS = 18  # 21:00 실행 기준 하루 1개. 늦게 실행돼도(PC 꺼짐) 다음 날과 겹치지 않게
MIN_HOURS_SINCE_ANY_POST = 8  # 크롬·앱으로 직접 올린 글(대기열 밖)이 있으면 그 뒤 8시간은 쉰다
LOW_QUEUE_WARN = 3


def load_queue():
    with open(QUEUE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def posted_path(item_id):
    return os.path.join(POSTED_DIR, f"{item_id}.json")


def load_records():
    recs = []
    for name in os.listdir(POSTED_DIR) if os.path.isdir(POSTED_DIR) else []:
        if name.endswith(".json"):
            try:
                with open(os.path.join(POSTED_DIR, name), "r", encoding="utf-8") as f:
                    recs.append(json.load(f))
            except (OSError, ValueError):
                continue
    return recs


def pick_reading_post():
    """마지막 무료 풀이 글이 READING_EVERY_DAYS일 이상 지났으면 다음 변형 글을 돌려준다(아니면 None)."""
    readings = [r for r in load_records() if r.get("kind") == "reading"]
    if readings:
        last = max(datetime.fromisoformat(r["posted_at"]) for r in readings)
        if hours_since(last) < READING_EVERY_DAYS * 24 - 6:
            return None
    with open(READING_PATH, "r", encoding="utf-8") as f:
        variants = json.load(f)
    return variants[len(readings) % len(variants)]


def last_posted_at():
    latest = None
    for name in os.listdir(POSTED_DIR) if os.path.isdir(POSTED_DIR) else []:
        if not name.endswith(".json"):
            continue
        try:
            with open(os.path.join(POSTED_DIR, name), "r", encoding="utf-8") as f:
                ts = datetime.fromisoformat(json.load(f)["posted_at"])
        except (OSError, ValueError, KeyError):
            continue
        latest = ts if latest is None or ts > latest else latest
    return latest


def hours_since(ts):
    return (datetime.now(timezone.utc) - ts).total_seconds() / 3600


def last_own_thread_at():
    """대기열 밖에서 직접 올린 글까지 포함한 내 최신 글 시각(API). 실패하면 None."""
    try:
        threads = threads_api.list_my_threads(5)
    except Exception as e:
        print(f"최근 글 조회 실패(무시): {e}")
        return None
    times = []
    for t in threads:
        try:
            times.append(datetime.strptime(t["timestamp"], "%Y-%m-%dT%H:%M:%S%z"))
        except (KeyError, ValueError):
            continue
    return max(times) if times else None


def main():
    git_sync.git_pull(BASE_DIR)
    last = last_posted_at()
    if last is not None and hours_since(last) < MIN_HOURS_BETWEEN_POSTS:
        print(f"마지막 Threads 자동 게시 후 {hours_since(last):.0f}시간 — 오늘은 건너뜁니다.")
        return
    own = last_own_thread_at()
    if own is not None and hours_since(own) < MIN_HOURS_SINCE_ANY_POST:
        print(f"직접 올린 글이 {hours_since(own):.1f}시간 전에 있어 오늘은 건너뜁니다.")
        return

    queue = load_queue()
    pending = [q for q in queue if not os.path.exists(posted_path(q["id"]))]
    reading = pick_reading_post()
    if reading:
        # 무료 풀이 글은 같은 변형을 여러 번 쓰므로 기록 파일 이름에 날짜를 붙인다.
        reading = {**reading, "kind": "reading", "record_id": f"{reading['id']}-{datetime.now().strftime('%Y%m%d')}"}
        pending = [reading] + pending
    if not pending:
        notify.notify("⚠️ 사주랩 Threads 대기열 비었음", "threads_queue.json에 새 글을 추가해주세요.", priority=4, tags=["warning"])
        print("Threads 대기열이 비었습니다.")
        return
    item = pending[0]
    rec_id = item.get("record_id", item["id"])

    lock_rel = os.path.relpath(os.path.join(POSTED_DIR, f"{rec_id}.lock"), BASE_DIR)
    acquired, holder = git_sync.try_acquire_lock(BASE_DIR, lock_rel)
    if not acquired:
        print(f"{item['id']}는 다른 컴퓨터({holder})가 처리 중입니다. 건너뜁니다.")
        return
    try:
        git_sync.git_pull(BASE_DIR)
        if os.path.exists(posted_path(rec_id)):
            print(f"{item['id']}는 다른 컴퓨터가 먼저 게시했습니다.")
            return
        print(f"Threads {item['id']} 게시 시작")
        media_id = threads_api.post_text(item["text"], item.get("topic"))
        record = {
            "id": item["id"], "media_id": media_id, "posted_at": datetime.now(timezone.utc).isoformat(),
            "topic": item.get("topic"), "exam": item.get("exam"), "kind": item.get("kind", "queue"),
        }
        # 게시 기록부터 남긴다 — 댓글이 실패해도 같은 글을 다음 날 또 올리면 안 되므로.
        os.makedirs(POSTED_DIR, exist_ok=True)
        with open(posted_path(rec_id), "w", encoding="utf-8") as f:
            json.dump(record, f, ensure_ascii=False, indent=2)
        comment_note = ""
        if item.get("comment"):
            try:
                record["comment_id"] = threads_api.reply(media_id, item["comment"])
            except Exception as e:
                comment_note = f"\n⚠️ 링크 댓글 실패(직접 달아주세요): {notify.summarize_error(str(e))}"
                record["comment_error"] = str(e)[:300]
            with open(posted_path(rec_id), "w", encoding="utf-8") as f:
                json.dump(record, f, ensure_ascii=False, indent=2)
        git_sync.git_commit_push(BASE_DIR, [os.path.relpath(posted_path(rec_id), BASE_DIR)], f"posted: threads {item['id']}")
        left = len([q for q in pending if q.get("kind") != "reading"]) - (0 if item.get("kind") == "reading" else 1)
        warn = f"\n📭 남은 글 {left}개 — 새 글 추가 필요" if left < LOW_QUEUE_WARN else ""
        notify.notify("✅ 사주랩 Threads 게시", f"{item['id']}: {item['text'].splitlines()[0]}{comment_note}{warn}", tags=["white_check_mark"])
        print(f"Threads {item['id']} 게시 완료 (media_id={media_id}), 남은 글 {left}개")
    except Exception as e:
        notify.notify("❌ 사주랩 Threads 실패", f"{item['id']}\n{notify.summarize_error(str(e))}", priority=5, tags=["rotating_light"])
        raise
    finally:
        git_sync.release_lock(BASE_DIR, lock_rel)


if __name__ == "__main__":
    main()
