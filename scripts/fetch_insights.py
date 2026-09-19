import csv
import glob
import json
import os
import re
import sys
from datetime import date, datetime, timezone

import requests
from dotenv import load_dotenv

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPTS_DIR)
import git_sync  # noqa: E402

BASE_DIR = os.path.dirname(SCRIPTS_DIR)
load_dotenv(os.path.join(BASE_DIR, ".env.local"))
TOKEN_PATH = os.path.join(BASE_DIR, "credentials", "instagram_token.json")
RENDER_ROOT = os.environ.get("SAJU_RENDER_DIR", os.path.join(os.path.expanduser("~"), "SajuAutoRender"))
# 게시 기록은 2026-09-05부로 컴퓨터 로컬(RENDER_ROOT)이 아니라 저장소 안
# scripts/posted_state/에 git으로 공유되게 바뀌었다(run_daily.py/run_daily_cardnews.py 참고,
# 중복 게시 방지 목적) — 노트북이 올린 항목도 여기서 보려면 이 위치를 봐야 한다.
POSTED_DIRS = [
    (os.path.join(BASE_DIR, "scripts", "posted_state", "reel"), "릴스"),
    (os.path.join(BASE_DIR, "scripts", "posted_state", "cardnews"), "카드뉴스"),
]
ANALYTICS_DIR = os.path.join(RENDER_ROOT, "analytics")
SNAPSHOT_MD = os.path.join(ANALYTICS_DIR, "snapshot.md")
DAILY_CSV = os.path.join(ANALYTICS_DIR, "daily_log.csv")

# 2026-09-19: 성과를 git 추적 파일로도 남긴다 — 대본 자동 생성(refill_queue → reel_rules)이 "잘 된/안 된
# 소재·훅·CTA"를 참고하고, 두 컴퓨터가 같은 기록을 보게 하기 위함.
PERF_DIR = os.path.join(SCRIPTS_DIR, "performance")
PERF_LATEST = os.path.join(PERF_DIR, "latest.json")
FOLLOWERS_LOG = os.path.join(PERF_DIR, "followers_log.json")
REELS_JSON = os.path.join(SCRIPTS_DIR, "reel-template", "reels.json")
CARDSETS_JSON = os.path.join(SCRIPTS_DIR, "cardnews-template", "cardsets.json")

# 캐러셀(카드뉴스)은 릴스 전용 지표(예: ig_reels_avg_watch_time)를 지원하지 않으므로,
# 두 타입 모두에서 공통으로 조회 가능한 지표만 요청한다.
METRICS = "reach,likes,comments,saved,shares,total_interactions,views"

APP_EVENTS = ["landing_view", "saju_start", "saju_complete", "free_result_view", "payment_success", "coupon_redeemed"]


def load_token_data():
    with open(TOKEN_PATH, "r", encoding="utf-8-sig") as f:
        return json.load(f)


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
        timeout=30,
    )
    if resp.status_code != 200:
        return {"error": f"{resp.status_code} {resp.text}"}
    result = {}
    for item in resp.json().get("data", []):
        values = item.get("values", [])
        result[item["name"]] = values[0]["value"] if values else None
    return result


def load_content_meta():
    """게시 기록의 id(R33/C17 등)로 대본 정보(제목·소재·훅·CTA 유형 등)를 찾기 위한 사전."""
    meta = {}
    try:
        with open(REELS_JSON, "r", encoding="utf-8") as f:
            for r in json.load(f):
                meta[r["id"]] = {
                    "title": r.get("title"), "category": r.get("categoryLabel"), "subcategory": r.get("subcategory"),
                    "topic": r.get("topic"), "hook_first": (r.get("hook") or [None])[0],
                    "ctaType": r.get("ctaType"), "durationSec": r.get("durationSec"), "keywords": r.get("keywords"),
                }
    except (OSError, json.JSONDecodeError):
        pass
    try:
        with open(CARDSETS_JSON, "r", encoding="utf-8") as f:
            for c in json.load(f):
                meta[c["id"]] = {"title": c.get("title"), "category": c.get("category")}
    except (OSError, json.JSONDecodeError):
        pass
    return meta


def fetch_account_stats(token_data):
    resp = requests.get(
        f"https://graph.instagram.com/v21.0/{token_data['user_id']}",
        params={"fields": "followers_count,media_count", "access_token": token_data["access_token"]},
        timeout=30,
    )
    if resp.status_code != 200:
        return {"error": f"{resp.status_code} {resp.text[:200]}"}
    data = resp.json()
    return {"followers": data.get("followers_count"), "media_count": data.get("media_count")}


def update_followers_log(stats):
    log = []
    if os.path.exists(FOLLOWERS_LOG):
        try:
            with open(FOLLOWERS_LOG, "r", encoding="utf-8") as f:
                log = json.load(f)
        except (OSError, json.JSONDecodeError):
            log = []
    today = date.today().isoformat()
    log = [row for row in log if row.get("date") != today]
    if stats.get("followers") is not None:
        log.append({"date": today, "followers": stats["followers"], "media_count": stats.get("media_count")})
    log.sort(key=lambda r: r["date"])
    with open(FOLLOWERS_LOG, "w", encoding="utf-8") as f:
        json.dump(log, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return log


def followers_delta(log, days):
    if len(log) < 2:
        return None
    latest = log[-1]
    past = [r for r in log if (date.fromisoformat(latest["date"]) - date.fromisoformat(r["date"])).days >= days]
    base = past[-1] if past else log[0]
    return latest["followers"] - base["followers"]


def neon_query(sql):
    """Neon의 SQL-over-HTTP로 읽기 전용 조회(별도 DB 드라이버 설치 없이 requests만 사용)."""
    url = os.environ.get("DATABASE_URL", "")
    m = re.match(r"postgres(?:ql)?://[^@]+@([^/:?]+)", url)
    if not m:
        raise RuntimeError("DATABASE_URL을 찾을 수 없음")
    resp = requests.post(
        f"https://{m.group(1)}/sql",
        headers={"Neon-Connection-String": url, "Content-Type": "application/json"},
        json={"query": sql, "params": []},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["rows"]


def fetch_app_metrics():
    """앱 유입·쿠폰 사용: 일자별 이벤트 수(최근 30일)와 쿠폰 발급/사용 누계.
    한계: 이벤트에 유입 경로(어느 릴스에서 왔는지)가 없어서 게시물별 유입은 못 구하고 '일자별 총량'만 본다."""
    try:
        names = ", ".join(f"'{n}'" for n in APP_EVENTS)
        rows = neon_query(
            "select to_char(date_trunc('day', \"createdAt\" at time zone 'Asia/Seoul'), 'YYYY-MM-DD') as day, name, count(*)::int as n "
            f"from \"AnalyticsEvent\" where \"createdAt\" > now() - interval '30 days' and name in ({names}) group by 1, 2 order by 1"
        )
        daily = {}
        for r in rows:
            daily.setdefault(r["day"], {})[r["name"]] = r["n"]
        coupons = neon_query('select count(*)::int as issued, count("usedAt")::int as used from "Coupon"')[0]
        return {"daily_events": daily, "coupons": coupons}
    except Exception as e:  # DB 조회 실패가 인스타 성과 기록 전체를 막으면 안 됨
        return {"error": str(e)[:300]}


def main():
    # 게시 기록(posted_state)을 최신으로 받은 뒤 읽는다 — 파일을 쓰고 나서 pull --rebase를 하면 변경사항 때문에 실패한다.
    git_sync.git_pull(BASE_DIR)
    token_data = load_token_data()
    access_token = token_data["access_token"]
    entries = load_posted_entries()
    if not entries:
        print("아직 게시된 항목이 없습니다.")
        return

    os.makedirs(ANALYTICS_DIR, exist_ok=True)
    os.makedirs(PERF_DIR, exist_ok=True)
    content_meta = load_content_meta()
    now = datetime.now(timezone.utc)
    rows = []
    perf_items = []
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

        item = {
            "type": entry["type_label"], "day": entry.get("day"), "id": entry.get("id"),
            "posted_at": entry.get("posted_at"),
            **content_meta.get(entry.get("id"), {}),
        }
        if entry.get("cta_type"):
            item["ctaType"] = entry["cta_type"]
        try:
            item["age_hours"] = round((now - datetime.fromisoformat(entry["posted_at"])).total_seconds() / 3600, 1)
        except (KeyError, ValueError, TypeError):
            item["age_hours"] = None
        if "error" in insights:
            item["error"] = insights["error"]
        else:
            item["metrics"] = insights
            reach = insights.get("reach") or 0
            if reach:
                item["interaction_rate"] = round((insights.get("total_interactions") or 0) / reach, 4)
        perf_items.append(item)

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

    # 3) git으로 공유되는 성과 파일(대본 자동 생성이 참고) + 팔로워 증감 + 앱 유입·쿠폰 사용
    stats = fetch_account_stats(token_data)
    log = update_followers_log(stats)
    latest = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "account": {**stats, "followers_delta_7d": followers_delta(log, 7), "followers_delta_30d": followers_delta(log, 30)},
        "items": perf_items,
        "app": fetch_app_metrics(),
    }
    with open(PERF_LATEST, "w", encoding="utf-8") as f:
        json.dump(latest, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"성과 파일 저장: {PERF_LATEST} (팔로워 {stats.get('followers')}, 앱 지표 {'오류' if 'error' in latest['app'] else '정상'})")

    ok = git_sync.git_commit_push(
        BASE_DIR,
        ["scripts/performance/latest.json", "scripts/performance/followers_log.json"],
        f"metrics: 인사이트 스냅샷 {date.today().isoformat()}",
    )
    print(f"성과 파일 git push {'성공' if ok else '실패(다음 실행 때 재시도)'}")


if __name__ == "__main__":
    main()
