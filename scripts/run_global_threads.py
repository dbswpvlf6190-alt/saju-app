"""해외판 Threads(@sajulab.jp / @sajulab.en) 하루 1개 자동 게시.

  python scripts/run_global_threads.py --market ja           # 정규 실행(작업 스케줄러)
  python scripts/run_global_threads.py --market en --dry-run # 무엇을 올릴지만 출력
  python scripts/run_global_threads.py --market en --now     # 게시 시간대 제한 무시(첫 글 등 수동 게시)

국내 run_daily_threads.py와 분리해 둔 이유: 국내 게시 규칙(풀이 글 매일·링크 댓글 끔 등)은 실험 결과로 정한 것이라
해외 새 계정의 초기 운영(하루 1개, 링크 댓글로 사이트 유도)과 섞으면 서로의 설정을 건드리게 된다.
대기열은 scripts/global_threads_{market}.json, 게시 기록은 scripts/posted_state/threads_{market}/<id>.json(git 추적).
링크 댓글의 ?ref=는 글 형식별 값이라 /admin의 해외판 랜딩(global_landing_view)에서 어떤 형식이 방문을 데려오는지 나뉜다.
"""
import argparse
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
SITE = "https://saju-app-three-dusky.vercel.app"

MARKETS = {
    # 게시 시간대(한국 시각): ja는 일본 밤(=한국 밤, 시차 없음), en은 미국 저녁(동부 21시≈한국 11시, 서부 21시≈한국 14시).
    # 컴퓨터가 꺼져 있다 늦게 실행돼도 엉뚱한 시간에 올라가지 않게 이 범위 밖이면 건너뛴다.
    "ja": {"hours": (18, 24), "topic": "占い", "comment": "無料診断はこちら（30秒・登録不要）👇\n{url}"},
    "en": {"hours": (9, 15), "topic": "Astrology", "comment": "Free reading (30 sec, no sign-up) 👇\n{url}"},
}
# 새 계정은 첫 몇 주 하루 1개만 올린다(스팸 판정 방지). 늦은 실행으로 두 개가 붙지 않게 20시간 간격을 둔다.
MIN_HOURS_BETWEEN_POSTS = 20
LOW_QUEUE_WARN = 2


def queue_path(market):
    return os.path.join(BASE_DIR, "scripts", f"global_threads_{market}.json")


def posted_dir(market):
    return os.path.join(BASE_DIR, "scripts", "posted_state", f"threads_{market}")


def load_records(market):
    d = posted_dir(market)
    recs = []
    for name in os.listdir(d) if os.path.isdir(d) else []:
        if name.endswith(".json"):
            try:
                with open(os.path.join(d, name), "r", encoding="utf-8") as f:
                    recs.append(json.load(f))
            except (OSError, ValueError):
                continue
    return recs


def hours_since(ts):
    return (datetime.now(timezone.utc) - ts).total_seconds() / 3600


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--market", choices=sorted(MARKETS), required=True)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--now", action="store_true", help="게시 시간대 제한 무시")
    args = ap.parse_args()
    market, cfg = args.market, MARKETS[args.market]
    threads_api.use_account(market)
    label = f"사주랩 해외판 Threads({market})"

    start, end = cfg["hours"]
    if not args.now and not (start <= datetime.now().hour < end):
        print(f"{market} 게시 시간대({start}~{end}시)가 아니라 건너뜁니다.")
        return
    if not args.dry_run:
        git_sync.git_pull(BASE_DIR)
    records = load_records(market)
    if records:
        last = max(datetime.fromisoformat(r["posted_at"]) for r in records)
        if hours_since(last) < MIN_HOURS_BETWEEN_POSTS:
            print(f"마지막 게시 후 {hours_since(last):.0f}시간 — 오늘은 건너뜁니다.")
            return

    with open(queue_path(market), "r", encoding="utf-8") as f:
        queue = json.load(f)
    done = {r["id"] for r in records}
    pending = [q for q in queue if q["id"] not in done]
    if not pending:
        notify.notify(f"⚠️ {label} 대기열 비었음", f"global_threads_{market}.json에 새 글을 추가해주세요.", priority=4, tags=["warning"])
        print("대기열이 비었습니다.")
        return
    item = pending[0]
    url = f"{SITE}/{market}?ref={item['ref']}"
    comment = cfg["comment"].format(url=url)
    if args.dry_run:
        print(f"[dry-run] {item['id']}\n{item['text']}\n--- 댓글 ---\n{comment}")
        return

    lock_rel = os.path.relpath(os.path.join(posted_dir(market), f"{item['id']}.lock"), BASE_DIR)
    acquired, holder = git_sync.try_acquire_lock(BASE_DIR, lock_rel)
    if not acquired:
        print(f"{item['id']}는 다른 컴퓨터({holder})가 처리 중입니다.")
        return
    try:
        git_sync.git_pull(BASE_DIR)
        rec_path = os.path.join(posted_dir(market), f"{item['id']}.json")
        if os.path.exists(rec_path):
            print(f"{item['id']}는 다른 컴퓨터가 먼저 게시했습니다.")
            return
        media_id = threads_api.post_text(item["text"], cfg["topic"])
        record = {"id": item["id"], "media_id": media_id, "posted_at": datetime.now(timezone.utc).isoformat(),
                  "ref": item["ref"], "text": item["text"]}
        os.makedirs(posted_dir(market), exist_ok=True)
        # 게시 기록부터 남긴다 — 댓글이 실패해도 같은 글을 다음 날 또 올리면 안 되므로.
        with open(rec_path, "w", encoding="utf-8") as f:
            json.dump(record, f, ensure_ascii=False, indent=2)
        comment_note = ""
        try:
            record["comment_id"] = threads_api.reply(media_id, comment)
        except Exception as e:
            comment_note = f"\n⚠️ 링크 댓글 실패(직접 달아주세요): {notify.summarize_error(str(e))}"
            record["comment_error"] = str(e)[:300]
        with open(rec_path, "w", encoding="utf-8") as f:
            json.dump(record, f, ensure_ascii=False, indent=2)
        git_sync.git_commit_push(BASE_DIR, [os.path.relpath(rec_path, BASE_DIR)], f"posted: threads_{market} {item['id']}")
        left = len(pending) - 1
        warn = f"\n📭 남은 글 {left}개 — 새 글 추가 필요" if left < LOW_QUEUE_WARN else ""
        notify.notify(f"✅ {label} 게시", f"{item['id']}: {item['text'].splitlines()[0]}{comment_note}{warn}", tags=["white_check_mark"])
        print(f"{item['id']} 게시 완료 (media_id={media_id}), 남은 글 {left}개")
    except Exception as e:
        notify.notify(f"❌ {label} 실패", f"{item['id']}\n{notify.summarize_error(str(e))}", priority=5, tags=["rotating_light"])
        raise
    finally:
        git_sync.release_lock(BASE_DIR, lock_rel)


if __name__ == "__main__":
    main()
