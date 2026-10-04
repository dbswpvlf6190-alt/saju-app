"""Threads 운영 변경(2026-10-04: 무료 풀이 '생일만'·2일 주기, 시험 소재 제외, 자기 찾기형 짧은 글) 전후 비교 보고.

  python scripts/threads_weekly_report.py baseline   # 기준점 저장(10/4에 한 번 실행함)
  python scripts/threads_weekly_report.py report     # 기준점 이후 글과 비교 → 보고서 + ntfy 요약

'실답글'은 답글 수에서 우리 계정 답글(링크 댓글·풀이 답글)을 뺀 값 — 일반 글은 링크 댓글 1개가 늘 섞여 있어서다.
"""
import json
import os
import sys
from datetime import datetime, timedelta, timezone

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import notify  # noqa: E402
import threads_api  # noqa: E402
from fetch_insights import neon_query  # noqa: E402

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PERF_DIR = os.path.join(BASE_DIR, "scripts", "performance")
BASELINE = os.path.join(PERF_DIR, "threads_baseline_20261004.json")
REPORT_MD = os.path.join(PERF_DIR, "threads_weekly_report.md")
CHANGE_AT = datetime(2026, 10, 4, 12, 0, tzinfo=timezone(timedelta(hours=9)))



def collect():
    posts = []
    for t in threads_api.list_my_threads(60):
        text = t.get("text") or ""
        try:
            m = threads_api.get_insights(t["id"])
            mine = sum(1 for r in threads_api.get_replies(t["id"]) if r.get("is_reply_owned_by_me"))
        except Exception:
            continue
        posts.append({
            "id": t["id"], "timestamp": t["timestamp"], "first_line": text.split("\n")[0][:60], "chars": len(text),
            # 무료 풀이 글: 첫 줄이 "생일만 적어주면…" / "…둘 생일 적어줘" / "…고민 하나만 적어줘" 형태
            "reading": "적어" in text.split("\n")[0] and ("생일" in text or "생년월일" in text),
            "views": m.get("views") or 0, "likes": m.get("likes") or 0,
            "real_replies": max(0, (m.get("replies") or 0) - mine),
        })
    return posts


def site_visits(since_kst, until_kst):
    rows = neon_query(f"""SELECT count(*) FILTER (WHERE "metaJson"::json->>'ref'='threads') th, count(*) total
      FROM "AnalyticsEvent" WHERE name='landing_view'
      AND "createdAt" >= '{since_kst.astimezone(timezone.utc):%Y-%m-%d %H:%M}' AND "createdAt" < '{until_kst.astimezone(timezone.utc):%Y-%m-%d %H:%M}'""")
    pay = neon_query(f"""SELECT count(*) c FROM "Order" WHERE status='PAID' AND amount > 0
      AND "paidAt" >= '{since_kst.astimezone(timezone.utc):%Y-%m-%d %H:%M}' AND "paidAt" < '{until_kst.astimezone(timezone.utc):%Y-%m-%d %H:%M}'""")
    return {"threads": int(rows[0]["th"]), "total": int(rows[0]["total"]), "payments": int(pay[0]["c"])}


def summarize(posts):
    def avg(xs, k):
        return round(sum(x[k] for x in xs) / len(xs), 1) if xs else None
    normal = [p for p in posts if not p["reading"]]
    reading = [p for p in posts if p["reading"]]
    return {
        "normal": {"count": len(normal), "avg_views": avg(normal, "views"), "avg_real_replies": avg(normal, "real_replies")},
        "reading": {"count": len(reading), "avg_views": avg(reading, "views"), "avg_real_replies": avg(reading, "real_replies")},
    }


def baseline():
    posts = collect()
    data = {
        "saved_at": datetime.now().isoformat(timespec="seconds"),
        "followers": threads_api.get_account().get("followers"),
        "posts": posts,
        "summary": summarize(posts),
        "site_7d": site_visits(CHANGE_AT - timedelta(days=7), CHANGE_AT),
    }
    os.makedirs(PERF_DIR, exist_ok=True)
    with open(BASELINE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(json.dumps({k: data[k] for k in ("followers", "summary", "site_7d")}, ensure_ascii=False, indent=2))


def report():
    with open(BASELINE, "r", encoding="utf-8") as f:
        base = json.load(f)
    posts = collect()
    after = [p for p in posts if datetime.strptime(p["timestamp"], "%Y-%m-%dT%H:%M:%S%z") >= CHANGE_AT]
    now = datetime.now(timezone(timedelta(hours=9)))
    cur = {
        "followers": threads_api.get_account().get("followers"),
        "summary": summarize(after),
        "site": site_visits(CHANGE_AT, now),
        "days": round((now - CHANGE_AT).total_seconds() / 86400, 1),
    }
    b, a = base["summary"], cur["summary"]
    top = sorted(after, key=lambda p: p["views"], reverse=True)[:5]
    lines = [
        f"# Threads 변경 전후 비교 ({now:%Y-%m-%d %H:%M}, 변경 후 {cur['days']}일)",
        "",
        "| 항목 | 변경 전(9/26~10/4) | 변경 후 |",
        "|---|---|---|",
        f"| 팔로워 | {base['followers']} | {cur['followers']} |",
        f"| 일반 글 평균 조회 | {b['normal']['avg_views']} ({b['normal']['count']}개) | {a['normal']['avg_views']} ({a['normal']['count']}개) |",
        f"| 일반 글 평균 실답글 | {b['normal']['avg_real_replies']} | {a['normal']['avg_real_replies']} |",
        f"| 무료 풀이 글 평균 조회 | {b['reading']['avg_views']} ({b['reading']['count']}개) | {a['reading']['avg_views']} ({a['reading']['count']}개) |",
        f"| 무료 풀이 글 평균 실답글 | {b['reading']['avg_real_replies']} | {a['reading']['avg_real_replies']} |",
        f"| 사이트 방문(Threads/전체) | 직전 7일 {base['site_7d']['threads']}/{base['site_7d']['total']} | {cur['site']['threads']}/{cur['site']['total']} |",
        f"| 실제 결제 | 직전 7일 {base['site_7d']['payments']} | {cur['site']['payments']} |",
        "",
        "## 변경 후 상위 글",
        *[f"- 조회 {p['views']} · 실답글 {p['real_replies']} · {p['first_line']}" for p in top],
    ]
    with open(REPORT_MD, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print("\n".join(lines))
    notify.notify(
        "📊 Threads 주간 비교",
        f"팔로워 {base['followers']}→{cur['followers']} · 일반 글 평균 조회 {b['normal']['avg_views']}→{a['normal']['avg_views']} · "
        f"풀이 글 {b['reading']['avg_views']}→{a['reading']['avg_views']} · Threads 방문 {cur['site']['threads']} · 결제 {cur['site']['payments']}\n"
        "자세한 건 Claude에게 'Threads 주간 보고'",
        tags=["bar_chart"],
    )


if __name__ == "__main__":
    {"baseline": baseline, "report": report}[sys.argv[1] if len(sys.argv) > 1 else "report"]()
