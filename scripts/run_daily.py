import json
import os
import sys
from datetime import datetime, timezone

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import publish_instagram  # noqa: E402
import git_sync  # noqa: E402
import refill_queue  # noqa: E402
import notify  # noqa: E402

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST_PATH = os.path.join(BASE_DIR, "scripts", "reel_manifest.json")
# 게시 완료 기록을 저장소 안(git 추적)에 남겨서 노트북·데스크톱이 서로의 게시 여부를 공유한다.
# 예전엔 컴퓨터마다 로컬(SajuAutoRender, 저장소 밖)에만 남겼는데, 그러면 두 컴퓨터가 같은 날
# 각자 "아직 안 올렸네"라고 판단해서 같은 릴스를 중복 게시할 위험이 있었다
# (shorts_auto/run_queue.py의 done.txt+락 방식과 통일, 2026-08-30).
POSTED_DIR = os.path.join(BASE_DIR, "scripts", "posted_state", "reel")


def load_manifest():
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def posted_path(day):
    return os.path.join(POSTED_DIR, f"{day:02d}.json")


def is_posted(day):
    return os.path.exists(posted_path(day))


def mark_posted(day, entry, media_id):
    os.makedirs(POSTED_DIR, exist_ok=True)
    record = {
        "day": day,
        "id": entry["id"],
        "media_id": media_id,
        "posted_at": datetime.now(timezone.utc).isoformat(),
    }
    # 고정댓글 문구와 CTA 유형도 같이 남겨서(인스타 API는 댓글 고정을 지원하지 않아 사람이 직접 고정해야 함),
    # 성과 기록(fetch_insights)이 CTA 유형별 반응을 비교할 수 있게 한다.
    if entry.get("pinned_comment"):
        record["pinned_comment"] = entry["pinned_comment"]
    if entry.get("cta_type"):
        record["cta_type"] = entry["cta_type"]
    with open(posted_path(day), "w", encoding="utf-8") as f:
        json.dump(record, f, ensure_ascii=False, indent=2)
    rel_path = os.path.relpath(posted_path(day), BASE_DIR)
    git_sync.git_commit_push(BASE_DIR, [rel_path], f"posted: reel day {day}")


def main():
    # 하루 실행당 딱 1건만 게시한다. 노트북/데스크톱 둘 다 이 스크립트를 돌릴 수 있으므로,
    # 먼저 최신 게시 기록을 받아오고 처리할 항목에 락을 걸어 중복 게시를 막는다.
    # 주의(2026-09-03 실제로 겪음): 이 스크립트는 "실행될 때마다 다음 미게시 항목 1개"를 올리므로,
    # Windows 작업 스케줄러 트리거에 반복(Repetition/재시도)을 걸면 한 번의 실행 창(예: 4시간) 안에서
    # 30분마다 계속 다음 항목을 찾아 여러 건이 연달아 게시돼버림(하루에 3건 이상 나간 사고 있었음).
    # shorts_auto의 run_queue.py는 매번 새 콘텐츠를 사람이 준비해야 해서 반복을 걸어도 안전하지만,
    # 여기는 manifest에 미리 만들어둔 항목이 쌓여있어서 절대 반복 트리거를 걸면 안 됨.
    git_sync.git_pull(BASE_DIR)
    try:
        refill_queue.ensure_reel_buffer()
    except Exception as e:
        # 자동 채우기가 실패해도(API 오류 등) 오늘 게시할 게 이미 있으면 게시는 계속 진행한다.
        print(f"자동 채우기 실패(무시하고 계속): {e}")
    entries = load_manifest()
    next_entry = next((e for e in entries if not is_posted(e["day"])), None)

    if next_entry is None:
        print("모든 대기열 항목이 이미 게시되었습니다. reel_manifest.json에 새 항목을 추가해주세요.")
        return

    day = next_entry["day"]
    lock_rel = os.path.relpath(os.path.join(POSTED_DIR, f"{day:02d}.lock"), BASE_DIR)
    acquired, holder = git_sync.try_acquire_lock(BASE_DIR, lock_rel)
    if not acquired:
        print(f"Day {day}는 다른 컴퓨터({holder})가 이미 처리 중인 것으로 보입니다. 건너뜁니다.")
        return

    try:
        # 락을 얻는 동안 다른 컴퓨터가 먼저 게시를 끝냈을 수 있으니 다시 한번 확인
        git_sync.git_pull(BASE_DIR)
        if is_posted(day):
            print(f"Day {day}는 다른 컴퓨터가 먼저 게시를 완료했습니다. 건너뜁니다.")
            return

        print(f"Day {day} ({next_entry['id']}, {next_entry['category']}) 게시 시작")
        video_path = next_entry["video"]
        if not os.path.isabs(video_path):
            video_path = os.path.join(BASE_DIR, video_path)
        media_id = publish_instagram.publish(
            video_path, next_entry["caption"], next_entry["remote_name"]
        )
        mark_posted(day, next_entry, media_id)
        print(f"Day {day} 게시 완료 (media_id={media_id})")
        pinned = next_entry.get("pinned_comment")
        notify.notify(
            f"✅ 사주랩 릴스 게시 완료 · Day {day} ({next_entry['id']})",
            f"{next_entry['caption'].splitlines()[0][:80]}\nmedia_id: {media_id}"
            + (f"\n\n📌 고정댓글(인스타에서 직접 달고 고정):\n{pinned}" if pinned else ""),
            tags=["white_check_mark"],
        )
        if next_entry.get("pinned_comment"):
            print("---- 고정댓글(인스타에서 직접 댓글 달고 고정해주세요) ----")
            print(next_entry["pinned_comment"])
            # 작업 스케줄러로 돌 땐 출력이 안 보이니, 열어보기 쉬운 위치(저장소 밖 로컬)에도 남겨둔다.
            try:
                render_root = os.environ.get("SAJU_RENDER_DIR", os.path.join(os.path.expanduser("~"), "SajuAutoRender"))
                os.makedirs(render_root, exist_ok=True)
                with open(os.path.join(render_root, "pinned_comment_latest.txt"), "w", encoding="utf-8") as pf:
                    pf.write(f"Day {day} ({next_entry['id']}) 고정댓글 — 인스타에서 이 문구로 댓글 달고 고정하세요\n\n{next_entry['pinned_comment']}\n")
            except OSError as e:
                print(f"고정댓글 파일 저장 실패(무시): {e}")
    except Exception as e:
        notify.notify(
            f"❌ 사주랩 릴스 게시 실패 · Day {day} ({next_entry['id']})",
            f"{str(e)[-300:]}\n(다음 스케줄에 자동 재시도, 오래 안 풀리면 OPS_NOTES.md 확인)",
            priority=5, tags=["rotating_light"],
        )
        raise
    finally:
        git_sync.release_lock(BASE_DIR, lock_rel)


if __name__ == "__main__":
    main()
