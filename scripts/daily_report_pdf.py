r"""사주랩 일일 보고서 PDF(데스크톱, 2026-10-23~). 사장님 요청: 채팅 보고는 읽기 어렵다 → 매일 한 장짜리 PDF를 바탕 화면에.

  python scripts/daily_report_pdf.py            # 오늘(KST) 보고서 → 바탕 화면\사주랩_일일보고\YYYY-MM-DD_사주랩_일일보고.pdf
                                                #   + 바탕 화면\오늘의_사주랩_보고.pdf(매일 덮어씀) + ntfy 알림
  python scripts/daily_report_pdf.py --no-notify

보고서 원칙(10/23 사장님 피드백 + 보고서 작성법 조사):
  ① 결론 먼저(맨 위 한 줄) ② 숫자는 항상 "오늘 · 어제 · 누적"으로 나눠서, 기준(목표)과 함께 ③ 숫자마다 판정(신호등)
  ④ 숫자 다음엔 "그래서 무슨 뜻인지 → 무엇을 할지" ⑤ 한 장, 매일 같은 자리 ⑥ 기준 시각·정의는 맨 아래에.
자동으로 모으는 것: Threads(팔로워·글 조회/답글), 인스타(performance/latest.json·followers_log.json — 매일 09:00 스냅샷),
사이트(이벤트 DB: metaJson.ua가 있는 사람 방문만, 10/19부터), 결제(Order: 웹/토스, 9월 이후·테스트 제외), 자동 작업·토큰 상태.
토스 콘솔 수치(사용자·광고·프로모션)와 요약·의미·할 일은 Claude가 scripts/report_notes.json에 적는다.
작업 스케줄러: SajuDailyReportPdf 매일 21:50.
"""
import argparse
import html
import json
import os
import shutil
import subprocess
import sys
import time
from datetime import date, datetime, timedelta, timezone

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import notify  # noqa: E402
import threads_api  # noqa: E402
from fetch_insights import neon_query  # noqa: E402

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KST = timezone(timedelta(hours=9))
DESKTOP = os.path.join(os.path.expanduser("~"), "Desktop")
OUT_DIR = os.path.join(DESKTOP, "사주랩_일일보고")
LATEST = os.path.join(DESKTOP, "오늘의_사주랩_보고.pdf")
NOTES = os.path.join(BASE_DIR, "scripts", "report_notes.json")
STATE = os.path.join(os.path.expanduser("~"), "SajuAutoRender", "report_state.json")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
TASK_NAMES = {"SajuThreadsDaily": "Threads 글", "SajuThreadsReplyDraft": "Threads 답글", "SajuAutoQueue": "인스타 릴스",
              "SajuAutoQueueCardnews": "인스타 카드뉴스", "SajuAnalyticsSnapshot": "통계 수집",
              "SajuIgReading": "인스타 참여형 글", "SajuIgReplies": "인스타 댓글 답글"}
KDT = "(\"createdAt\" at time zone 'UTC') at time zone 'Asia/Seoul'"
HUMAN_SINCE = "2026-10-19"  # 로봇 제외(ua 표시) 이후 첫 온전한 날
PAID_SINCE = "2026-09-01"  # 8월 결제 4건은 출시 전 본인 시험
TEST_ORDERS = ("toss-9f4e2019", "toss-3f1e76d2", "toss-4738803c")  # 10/20 토스 실결제 시험(사장님 아이폰)
THREADS_POST_GOAL = 300
TOSS_BREAKEVEN = 15


def load_json(path, default):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def kdate(ts):
    return ts.astimezone(KST).date()


# ---------- 모으기 ----------
def collect_threads(today, state):
    acc = threads_api.get_account()
    posts = []
    for t in threads_api.list_my_threads(14):
        ts = datetime.strptime(t["timestamp"], "%Y-%m-%dT%H:%M:%S%z").astimezone(KST)
        if ts.date() < today - timedelta(days=7):
            continue
        try:
            m = threads_api.get_insights(t["id"])
        except Exception:
            m = {}
        posts.append({"at": ts, "title": (t.get("text") or "").split("\n")[0][:34], "views": m.get("views") or 0, "replies": m.get("replies") or 0})
    hist = state.setdefault("threads_followers", {})
    if not isinstance(hist, dict):  # 첫 버전 상태 파일(숫자 하나) 호환
        hist = state["threads_followers"] = {}
    hist[today.isoformat()] = acc.get("followers") or 0

    def day_views(d):
        ps = [p for p in posts if p["at"].date() == d]
        return (sum(p["views"] for p in ps), sum(p["replies"] for p in ps), len(ps))

    return {"followers": acc.get("followers") or 0, "posts": posts, "hist": hist,
            "today": day_views(today), "yesterday": day_views(today - timedelta(days=1)),
            "week_views": sum(p["views"] for p in posts if p["at"].date() > today - timedelta(days=7))}


def delta(hist, d):
    """d일의 증감 = d일 값 - d일 이전 가장 가까운 기록. 기록이 없으면 None."""
    if not isinstance(hist, dict) or d.isoformat() not in hist:
        return None
    prev = [k for k in hist if k < d.isoformat()]
    return None if not prev else hist[d.isoformat()] - hist[max(prev)]


def collect_instagram(today):
    d = load_json(os.path.join(BASE_DIR, "scripts", "performance", "latest.json"), {})
    log = load_json(os.path.join(BASE_DIR, "scripts", "performance", "followers_log.json"), [])
    hist = {r["date"]: r["followers"] for r in log if "date" in r and "followers" in r}
    items = sorted(d.get("items", []), key=lambda x: x.get("posted_at") or "")[-5:]
    posts = [{"at": (i.get("posted_at") or "")[5:10].replace("-", "/"), "type": i.get("type"), "title": (i.get("title") or "").replace("\n", " ")[:22],
              "views": (i.get("metrics") or {}).get("views") or (i.get("metrics") or {}).get("reach") or 0} for i in items]
    snap = d.get("generated_at", "")
    snap = f"{snap[5:7]}/{snap[8:10]} {snap[11:16]}" if len(snap) >= 16 else "-"
    return {"followers": (d.get("account") or {}).get("followers"), "posts": posts, "snap": snap, "hist": hist}


def collect_site(today):
    t, y = today.isoformat(), (today - timedelta(days=1)).isoformat()
    rows = neon_query(
        f"select to_char({KDT},'YYYY-MM-DD') d, name, count(*)::int n from \"AnalyticsEvent\" "
        f"where {KDT} >= '{HUMAN_SINCE}' and \"metaJson\"::json->>'ua' is not null "
        f"and name in ('landing_view','saju_start','premium_cta_click') group by 1,2"
    )
    by, cum = {}, {}
    for r in rows:
        by.setdefault(r["d"], {})[r["name"]] = r["n"]
        cum[r["name"]] = cum.get(r["name"], 0) + r["n"]
    all_start = neon_query("select count(*)::int n from \"AnalyticsEvent\" where name='saju_start'")[0]["n"]
    ua_threads = neon_query(
        f"select count(*)::int n from \"AnalyticsEvent\" where name='landing_view' and {KDT} >= '{HUMAN_SINCE}' and \"metaJson\"::json->>'ua'='threads'"
    )[0]["n"]
    orders = neon_query(
        f"select \"paymentId\" pid, amount, to_char({KDT},'YYYY-MM-DD') d from \"Order\" where status='PAID' and amount > 0 and {KDT} >= '{PAID_SINCE}'"
    )
    real = [o for o in orders if not o["pid"].startswith(TEST_ORDERS)]
    web = [o for o in real if not o["pid"].startswith("toss-")]
    toss = [o for o in real if o["pid"].startswith("toss-")]

    def pay(lst):
        return {"t": sum(1 for o in lst if o["d"] == t), "y": sum(1 for o in lst if o["d"] == y),
                "n": len(lst), "amt": sum(o["amount"] for o in lst)}

    return {"t": by.get(t, {}), "y": by.get(y, {}), "cum": cum, "all_start": all_start,
            "ua_threads": ua_threads, "web": pay(web), "toss": pay(toss)}


def collect_health():
    out = []
    try:
        ps = ("Get-ScheduledTask | Where-Object { $_.TaskName -like 'Saju*' -and $_.State -ne 'Disabled' } | ForEach-Object { $i = $_ | Get-ScheduledTaskInfo; "
              "'{0}|{1}|{2}|{3}' -f $_.TaskName, $i.LastTaskResult, $i.LastRunTime.ToString('MM-dd HH:mm'), [int](((Get-Date) - $i.LastRunTime).TotalHours) }")
        res = subprocess.run(["powershell", "-NoProfile", "-Command", ps], capture_output=True, text=True, timeout=60)
        for line in res.stdout.splitlines():
            name, code, when, hours = (line.split("|") + ["", "", "0"])[:4]
            if name in TASK_NAMES:
                # 0 성공, 267011 아직 안 돔, 267014 사람이 중지 → 실패 아님. 48시간 넘은 기록은 무시.
                ok = code.strip() in ("0", "267011", "267014") or int(hours or 0) > 48
                out.append({"name": TASK_NAMES[name], "ok": ok, "code": code.strip(), "when": when.strip()})
    except Exception as e:
        out.append({"name": "작업 확인", "ok": False, "code": str(e)[:60], "when": ""})
    tokens = []
    for f, label in (("instagram_token.json", "인스타"), ("threads_token.json", "Threads")):
        d = load_json(os.path.join(BASE_DIR, "credentials", f), {})
        if d.get("obtained_at"):
            tokens.append({"name": label, "age": round((time.time() - d["obtained_at"]) / 86400)})
    return {"tasks": out, "tokens": tokens}


# ---------- 그리기 ----------
LIGHT = {"green": ("#2f9e5b", "좋음"), "yellow": ("#d39b16", "보통"), "red": ("#d6513a", "주의"), "gray": ("#9aa1ab", "-")}


def esc(s):
    return html.escape(str(s))


def sgn(v, unit=""):
    if v is None:
        return "–"
    return f"{v:+,}{unit}" if v else f"0{unit}"


def num(v, unit=""):
    return "–" if v is None else f"{v:,}{unit}"


def dot(light):
    c, label = LIGHT.get(light, LIGHT["gray"])
    return f'<span class="dot" style="background:{c}"></span><span class="lt" style="color:{c}">{label}</span>'


def render(now, th, ig, site, health, notes):
    today = now.date()
    yday = today - timedelta(days=1)
    toss = notes.get("toss") or {}
    tv, tr, tn = th["today"]
    yv, yr, yn = th["yesterday"]
    th_post_light = "gray" if not tn else ("green" if tv >= THREADS_POST_GOAL else "yellow" if tv >= 100 else "red")
    if not tn and yn:  # 오늘 글이 아직 없으면(21시 전) 어제 글로 판정
        th_post_light = "green" if yv >= THREADS_POST_GOAL else "yellow" if yv >= 100 else "red"
    ig_best = max([p["views"] for p in ig["posts"]] or [0])
    s_t, s_y, s_c = site["t"], site["y"], site["cum"]
    web, tpay = site["web"], site["toss"]

    rows = [
        # (구분, 항목, 오늘, 어제, 누적, 기준, 판정)
        ("Threads", "팔로워", sgn(delta(th["hist"], today), "명"), sgn(delta(th["hist"], yday), "명"), num(th["followers"], "명"), "주 +10명", "green" if (delta(th["hist"], today) or 0) > 0 else "yellow"),
        ("", "그날 올린 글 조회 · 답글", f"{tv:,} · {tr}" if tn else "21시 게시 전", f"{yv:,} · {yr}" if yn else "글 없음", f"7일 {th['week_views']:,}회", f"글당 {THREADS_POST_GOAL}회", th_post_light),
        ("인스타", "팔로워", sgn(delta(ig["hist"], today), "명"), sgn(delta(ig["hist"], yday), "명"), num(ig["followers"], "명"), "주 +5명", "red" if (ig["followers"] or 0) < 20 else "yellow"),
        ("", "최근 게시물 최고 조회", "", "", f"{ig_best:,}회", "게시물당 300회", "green" if ig_best >= 300 else "yellow" if ig_best >= 100 else "red"),
        ("사이트", "방문 (사람만)", num(s_t.get("landing_view", 0), "명"), num(s_y.get("landing_view", 0), "명"), f"{s_c.get('landing_view', 0):,}명 (10/19~)", "하루 20명", "green" if s_t.get("landing_view", 0) >= 20 else "yellow" if s_y.get("landing_view", 0) >= 7 else "red"),
        ("", "생일 입력 → 무료 결과", num(s_t.get("saju_start", 0), "명"), num(s_y.get("saju_start", 0), "명"), f"{site['all_start']:,}명 (전체)", "하루 5명", "green" if s_t.get("saju_start", 0) >= 5 else "yellow" if s_t.get("saju_start", 0) + s_y.get("saju_start", 0) >= 2 else "red"),
        ("", "상세 풀이 버튼", num(s_t.get("premium_cta_click", 0), "명"), num(s_y.get("premium_cta_click", 0), "명"), f"{s_c.get('premium_cta_click', 0):,}명 (10/19~)", "", "gray"),
        ("", "웹 결제", f"{web['t']}건", f"{web['y']}건", f"{web['n']}건 · {web['amt']:,}원", "첫 결제", "green" if web["n"] else "red"),
        ("토스", "사용자", num(toss.get("users_today"), "명"), num(toss.get("users_yesterday"), "명"), num(toss.get("users_total"), "명"), "", "yellow"),
        ("", "인앱 결제", f"{tpay['t']}건", f"{tpay['y']}건", f"{tpay['n']}건 · {tpay['amt']:,}원", f"손익분기 {TOSS_BREAKEVEN}건", "green" if tpay["n"] >= TOSS_BREAKEVEN else "yellow" if tpay["n"] else "red"),
        ("", "광고 수익 · 프로모션 지출", "", "", f"{num(toss.get('ad_total'), '원')} · {num(toss.get('promo_spent'), '원')}", "광고 ≥ 지출", "red" if (toss.get("ad_total") or 0) < (toss.get("promo_spent") or 0) else "green"),
    ]
    tr_html = ""
    for g, item, a, b, c, goal, light in rows:
        tr_html += (f"<tr{' class=grp' if g else ''}><td class='g'>{esc(g)}</td><td class='it'>{esc(item)}</td><td class='n today'>{esc(a)}</td>"
                    f"<td class='n'>{esc(b)}</td><td class='n cum'>{esc(c)}</td><td class='goal'>{esc(goal)}</td><td class='st'>{dot(light) if light != 'gray' else ''}</td></tr>")

    alerts = [f"{t['name']} 자동 작업 실패 ({t['when']}, 코드 {t['code']})" for t in health["tasks"] if not t["ok"]]
    alerts += [f"{t['name']} 연결 키 {t['age']}일째 (60일 만료)" for t in health["tokens"] if t["age"] >= 55]
    alerts += notes.get("alerts", [])

    def ul(items, empty):
        return "".join(f"<li>{esc(x)}</li>" for x in items) or f"<li class='ok'>{esc(empty)}</li>"

    posts = sorted(th["posts"], key=lambda p: p["at"], reverse=True)[:5]
    rows_po = "".join(f"<tr><td>{p['at']:%m/%d %H:%M}</td><td>{esc(p['title'])}</td><td class='n'>{p['views']:,}</td><td class='n'>{p['replies']}</td></tr>" for p in posts)
    summary = notes.get("summary") or f"Threads 어제 글 {yv:,}회 · 사이트 오늘 방문 {s_t.get('landing_view', 0)}명 · 실결제 누적 {web['n'] + tpay['n']}건"
    toss_asof = f" · 토스 수치는 콘솔 {esc(toss.get('as_of'))} 기준(Claude 입력)" if toss.get("as_of") else " · 토스 사용자·광고는 Claude가 콘솔에서 옮겨 적을 때만 표시"

    return f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
@page {{ size: A4; margin: 13mm 13mm 11mm; }}
body {{ font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; color: #1d2230; font-size: 11pt; margin: 0; }}
.top {{ display: flex; justify-content: space-between; align-items: baseline; }}
h1 {{ font-size: 19pt; margin: 0; }}
.date {{ color: #6b7280; font-size: 10.5pt; }}
.summary {{ margin: 10px 0 12px; padding: 11px 14px; background: #f4f1fb; border-left: 5px solid #7b5cd6; font-size: 13pt; font-weight: 700; line-height: 1.5; }}
.summary small {{ display: block; font-size: 9.5pt; font-weight: 600; color: #6b5aa8; margin-bottom: 2px; }}
h2 {{ font-size: 12.5pt; margin: 14px 0 5px; padding-bottom: 3px; border-bottom: 2px solid #1d2230; }}
table {{ width: 100%; border-collapse: collapse; font-size: 10.5pt; }}
td, th {{ padding: 6px 6px; border-bottom: 1px solid #eceef2; vertical-align: middle; text-align: left; }}
th {{ font-size: 9pt; color: #6b7280; font-weight: 600; background: #fafafa; }}
th.n, td.n {{ text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }}
tr.grp td {{ border-top: 1.5px solid #c9ccd3; }}
td.g {{ font-weight: 800; width: 52px; }}
td.it {{ width: 150px; }}
td.today {{ font-weight: 800; font-size: 11.5pt; background: #fbfaff; }}
td.cum {{ font-weight: 700; }}
td.goal {{ color: #6b7280; font-size: 9pt; white-space: nowrap; }}
td.st {{ white-space: nowrap; width: 54px; }}
.dot {{ display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; vertical-align: -1px; }}
.lt {{ font-weight: 800; font-size: 9.5pt; }}
.three {{ display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }}
.box {{ border: 1px solid #e5e7eb; border-radius: 9px; padding: 6px 10px 8px; }}
.box h3 {{ margin: 2px 0 2px; font-size: 10.5pt; }}
.box.mean {{ background: #f7faff; border-color: #cfe0f7; }}
.box.todo {{ background: #faf8ff; border-color: #d9cdf5; }}
.box.warn {{ background: #fff8f6; border-color: #f2c9bf; }}
ul {{ margin: 2px 0 0; padding-left: 16px; line-height: 1.5; font-size: 10pt; }}
li.ok {{ color: #2f9e5b; list-style: none; margin-left: -16px; }}
.foot {{ margin-top: 10px; color: #9aa1ab; font-size: 8pt; line-height: 1.5; }}
</style></head><body>
<div class="top"><h1>사주랩 일일 보고</h1><div class="date">{now:%Y.%m.%d} ({'월화수목금토일'[now.weekday()]}) {now:%H:%M} 기준</div></div>
<div class="summary"><small>오늘의 결론</small>{esc(summary)}</div>
<h2>숫자 — 오늘 · 어제 · 누적</h2>
<table><tr><th>채널</th><th>항목</th><th class="n">오늘</th><th class="n">어제</th><th class="n">누적</th><th>기준</th><th>판정</th></tr>{tr_html}</table>
<div class="three" style="margin-top:12px">
  <div class="box mean"><h3>📌 그래서 무슨 뜻인가</h3><ul>{ul(notes.get('meaning', [])[:3], '특이한 변화 없음')}</ul></div>
  <div class="box todo"><h3>✅ 다음 할 일 · 결정</h3><ul>{ul(notes.get('decisions', [])[:3], '오늘 결정할 것 없음')}</ul></div>
  <div class="box warn"><h3>⚠️ 확인할 것</h3><ul>{ul(alerts[:3], '자동 작업·연결 모두 정상')}</ul></div>
</div>
<h2>Threads 최근 글</h2>
<table><tr><th>게시</th><th>첫 줄</th><th class="n">조회</th><th class="n">답글</th></tr>{rows_po}</table>
<div class="foot">오늘 = {today:%m/%d} 0시~지금, 어제 = {yday:%m/%d} 하루. 사이트 방문은 사람만(로봇 제외 이후 {HUMAN_SINCE[5:].replace('-', '/')}~). 생일 입력 누적은 사이트 오픈 이후 전체.
결제는 9월 이후 실결제만(8월 출시 전 시험·10/20 토스 시험 3건·무료 쿠폰 제외). Threads 팔로워 증감은 보고서가 매일 기록한 값끼리 비교.
인스타 수치는 {esc(ig['snap'])} 스냅샷{toss_asof}.</div>
</body></html>"""


def to_pdf(html_text, out_pdf):
    tmp = os.path.join(os.path.dirname(STATE), "daily_report.html")
    os.makedirs(os.path.dirname(tmp), exist_ok=True)
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(html_text)
    if os.path.exists(out_pdf):
        os.remove(out_pdf)
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", f"--print-to-pdf={out_pdf}", "file:///" + tmp.replace("\\", "/")],
                   capture_output=True, timeout=120)
    if not os.path.exists(out_pdf):
        raise RuntimeError("PDF 생성 실패(크롬)")


def fresh_notes(today):
    """메모(결론·의미·토스 수치·알림)는 오늘·어제 날짜 것만 쓴다(지난 메모가 남지 않게). 결정·할 일은 지울 때까지 유지."""
    notes = load_json(NOTES, {})
    if notes.get("date") not in (today.isoformat(), (today - timedelta(days=1)).isoformat()):
        for k in ("summary", "meaning", "alerts", "toss"):
            notes.pop(k, None)
    return notes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-notify", action="store_true")
    args = ap.parse_args()
    now = datetime.now(KST)
    today = now.date()
    notes = fresh_notes(today)
    state = load_json(STATE, {})
    th = collect_threads(today, state)
    ig = collect_instagram(today)
    site = collect_site(today)
    health = collect_health()
    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, f"{today.isoformat()}_사주랩_일일보고.pdf")
    to_pdf(render(now, th, ig, site, health, notes), out)
    try:
        shutil.copyfile(out, LATEST)
    except OSError as e:
        print(f"바탕 화면 사본 실패(열려 있을 수 있음): {e}")
    os.makedirs(os.path.dirname(STATE), exist_ok=True)
    with open(STATE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False)
    print(f"저장: {out}")
    if not args.no_notify:
        tv, _, tn = th["today"]
        notify.notify("📄 사주랩 일일 보고", f"바탕 화면 '오늘의_사주랩_보고.pdf' · 오늘 사이트 방문 {site['t'].get('landing_view', 0)}명 · "
                      f"실결제 누적 {site['web']['n'] + site['toss']['n']}건", tags=["page_facing_up"])


if __name__ == "__main__":
    main()
