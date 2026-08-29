import csv
import glob
import json
import os
import sys
from datetime import date, datetime, timezone

import requests

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOKEN_PATH = os.path.join(BASE_DIR, "credentials", "instagram_token.json")
RENDER_ROOT = os.environ.get("SAJU_RENDER_DIR", os.path.join(os.path.expanduser("~"), "SajuAutoRender"))
POSTED_DIRS = [
    (os.path.join(RENDER_ROOT, "posted"), "릴스"),
    (os.path.join(RENDER_ROOT, "posted_cardnews"), "카드뉴스"),
]
ANALYTICS_DIR = os.path.join(RENDER_ROOT, "analytics")
SNAPSHOT_MD = os.path.join(ANALYTICS_DIR, "snapshot.md")
DAILY_CSV = os.path.join(ANALYTICS_DIR, "daily_log.csv")

# 캐러셀(카드뉴스)은 릴스 전용 지표(예: ig_reels_avg_watch_time)를 지원하지 않으므로,
# 두 타입 모두에서 공통으로 조회 가능한 지표만 요청한다.
METRICS = "reach,likes,comments,saved,shares,total_interactions,views"


def load_token():
    with open(TOKEN_PATH, "r", encoding="utf-8-sig") as f:
        return json.load(f)["access_token"]


def load_posted_entries():
    entries = []
    for dir_path, label in POSTED_DIRS:
        for path in sorted(glob.glob(os.path.join(dir_path, "*.json"))):
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            data["type_label"] = label
            entries.append(data)
    return entries


def fetch_media_insights(media_id, access_token):
    resp = requests.get(
        f"https://graph.instagram.com/v21.0/{media_id}/insights",
        params={"metric": METRICS, "access_token": access_token},
    )
    if resp.status_code != 200:
        return {"error": f"{resp.status_code} {resp.text}"}
    result = {}
    for item in resp.json().get("data", []):
        values = item.get("values", [])
        result[item["name"]] = values[0]["value"] if values else None
    return result


def main():
    access_token = load_token()
    entries = load_posted_entries()
    if not entries:
        print("아직 게시된 항목이 없습니다.")
        return

    os.makedirs(ANALYTICS_DIR, exist_ok=True)
    rows = []
    for entry in entries:
        insights = fetch_media_insights(entry["media_id"], access_token)
        rows.append({
            "posted_at": entry.get("posted_at", ""),
            "type": entry["type_label"],
            "day": entry.get("day"),
            "id": entry.get("id"),
            **insights,
        })
        print(f"{entry['type_label']} Day {entry.get('day')} ({entry.get('id')}): {insights}")

    # 1) 오늘자 스냅샷을 마크다운 표로 통째로 다시 쓴다(최신 상태 보기용)
    with open(SNAPSHOT_MD, "w", encoding="utf-8") as f:
        f.write(f"# 사주랩 인스타그램 인사이트 스냅샷 ({datetime.now().strftime('%Y-%m-%d %H:%M')})\n\n")
        f.write("| 타입 | Day | ID | 조회수 | 도달 | 좋아요 | 댓글 | 저장 | 공유 | 총 상호작용 | 게시 시각 |\n")
        f.write("|---|---|---|---|---|---|---|---|---|---|---|\n")
        for r in rows:
            if "error" in r:
                f.write(f"| {r['type']} | {r['day']} | {r['id']} | 오류: {r['error']} | | | | | | | {r['posted_at']} |\n")
                continue
            f.write(
                f"| {r['type']} | {r['day']} | {r['id']} | {r.get('views','-')} | {r.get('reach','-')} | "
                f"{r.get('likes','-')} | {r.get('comments','-')} | {r.get('saved','-')} | {r.get('shares','-')} | "
                f"{r.get('total_interactions','-')} | {r['posted_at']} |\n"
            )

    # 2) 날짜별 한 줄씩 CSV에 계속 쌓아서(MARKETING_KPI.md의 주간 기록 시트 원본 데이터로 쓸 수 있게) 추세를 남긴다
    file_exists = os.path.exists(DAILY_CSV)
    with open(DAILY_CSV, "a", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["snapshot_date", "type", "day", "id", "views", "reach", "likes", "comments", "saved", "shares", "total_interactions", "posted_at"])
        today = date.today().isoformat()
        for r in rows:
            if "error" in r:
                continue
            writer.writerow([today, r["type"], r["day"], r["id"], r.get("views"), r.get("reach"), r.get("likes"), r.get("comments"), r.get("saved"), r.get("shares"), r.get("total_interactions"), r["posted_at"]])

    print(f"\n스냅샷 저장: {SNAPSHOT_MD}")
    print(f"추세 로그 누적: {DAILY_CSV}")


if __name__ == "__main__":
    main()
