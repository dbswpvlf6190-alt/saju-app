"""사용자가 요청한 '추가 게시' 1건 — 대기열의 다음 일반 글을 링크 댓글 없이 올리고 kind=extra로 기록한다.
정규 슬롯(run_daily_threads.py)의 간격 계산에서 extra는 빠지므로 그날 정규 글이 밀리지 않는다.
보통 1회성 작업 스케줄러(SajuThreadsExtra*)로 실행한다.
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
from run_daily_threads import BASE_DIR, load_queue, posted_path  # noqa: E402


def main():
    git_sync.git_pull(BASE_DIR)
    want = sys.argv[1] if len(sys.argv) > 1 else None  # 특정 글 id(예: T22)를 지정할 수 있다
    item = next((q for q in load_queue() if not os.path.exists(posted_path(q["id"])) and (want is None or q["id"] == want)), None)
    if item is None:
        print("올릴 대기 글이 없습니다.")
        return
    media_id = threads_api.post_text(item["text"], item.get("topic"))
    rec = {"id": item["id"], "media_id": media_id, "posted_at": datetime.now(timezone.utc).isoformat(),
           "topic": item.get("topic"), "exam": item.get("exam"), "kind": "extra"}
    with open(posted_path(item["id"]), "w", encoding="utf-8") as f:
        json.dump(rec, f, ensure_ascii=False, indent=2)
    git_sync.git_commit_push(BASE_DIR, [os.path.relpath(posted_path(item["id"]), BASE_DIR)], f"posted: threads {item['id']} (추가 게시)")
    notify.notify("✅ Threads 추가 게시", f"{item['id']}: {item['text'].splitlines()[0]}", tags=["white_check_mark"])
    print(f"추가 게시 완료 {item['id']} ({media_id})")


if __name__ == "__main__":
    main()
