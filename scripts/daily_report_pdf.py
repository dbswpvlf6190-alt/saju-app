r"""사주랩 일일 보고서 PDF(데스크톱, 2026-10-23~). 사장님 요청: 채팅 보고는 읽기 어렵다 → 매일 한 장짜리 PDF를 바탕 화면에.

  python scripts/daily_report_pdf.py            # 오늘(KST) 보고서 → 바탕 화면\사주랩_일일보고\YYYY-MM-DD_사주랩_일일보고.pdf
                                                #   + 바탕 화면\오늘의_사주랩_보고.pdf(매일 덮어씀) + ntfy 알림
  python scripts/daily_report_pdf.py --no-notify

모으는 것(자동): Threads(팔로워·최근 글 조회/답글), 인스타(performance/latest.json — 매일 09:00 스냅샷),
사이트(이벤트 DB, 10/18부터 로봇 제외), 결제(Order: 웹/토스), 자동 작업 성공 여부·토큰 나이.
토스 콘솔 수치(사용자·광고·프로모션)는 로그인이 필요해 자동으로 못 모은다 → Claude가 scripts/report_notes.json에 적으면 같이 나온다.
쓰는 원칙: 한 장, 큰 숫자, 신호등(초록·노랑·빨강), 문장은 짧게, 할 일·결정은 3개까지.
작업 스케줄러: SajuDailyReportPdf 매일 21:50(21:30 답글 뒤). 노트북 전용 C:\\saju-reports 보고서와는 별개.
"""
import argparse
import html
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timedelta, timezone

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
TASKS = ["SajuThreadsDaily", "SajuThreadsReplyDraft", "SajuAutoQueue", "SajuAutoQueueCardnews", "SajuAnalyticsSnapshot"]
TASK_NAMES = {"SajuThreadsDaily": "Threads 글", "SajuThreadsReplyDraft": "Threads 답글", "SajuAutoQueue": "인스타 릴스",
              "SajuAutoQueueCardnews": "인스타 카드뉴스", "SajuAnalyticsSnapshot": "통계 수집"}
KDT = "(\"createdAt\" at time zone 'UTC') at time zone 'Asia/Seoul'"


def load_json(path, default):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


# ---------- 모으기 ----------
def collect_threads(now):
    acc = threads_api.get_account()
    posts = []
    for t in threads_api.list_my_threads(12):
        ts = datetime.strptime(t["timestamp"], "%Y-%m-%dT%H:%M:%S%z").astimezone(KST)
        if ts < now - timedelta(days=7):
            continue
        try:
            m = threads_api.get_insights(t["id"])
        except Exception:
            m = {}
        posts.append({"at": ts, "title": (t.get("text") or "").split("\n")[0][:34], "views": m.get("views") or 0, "replies": m.get("replies") or 0})
    return {"followers": acc.get("followers") or 0, "posts": posts}


def collect_instagram():
    d = load_json(os.path.join(BASE_DIR, "scripts", "performance", "latest.json"), {})
    items = sorted(d.get("items", []), key=lambda x: x.get("posted_at") or "")[-5:]
    posts = [{"at": (i.get("posted_at") or "")[5:10].replace("-", "/"), "type": i.get("type"), "title": (i.get("title") or "").replace("\n", " ")[:24],
              "views": (i.get("metrics") or {}).get("views") or (i.get("metrics") or {}).get("reach") or 0} for i in items]
    snap = d.get("generated_at", "")
    snap = f"{snap[5:7]}/{snap[8:10]} {snap[11:16]}" if len(snap) >= 16 else "-"
    return {"followers": (d.get("account") or {}).get("followers"), "posts": posts, "snap": snap}


def collect_site(today):
    start7 = (today - timedelta(days=6)).strftime("%Y-%m-%d")
    rows = neon_query(
        f"select to_char({KDT},'YYYY-MM-DD') d, name, count(*)::int n from \"AnalyticsEvent\" "
        f"where {KDT} >= '{start7}' and \"metaJson\"::json->>'ua' is not null "
        f"and name in ('landing_view','saju_start','premium_cta_click','good_year_cta_click','checkout_start') group by 1,2"
    )
    by = {}
    for r in rows:
        by.setdefault(r["d"], {})[r["name"]] = r["n"]
    t = today.strftime("%Y-%m-%d")
    week = {k: sum(v.get(k, 0) for v in by.values()) for k in ("landing_view", "saju_start", "premium_cta_click", "checkout_start")}
    # 사람 방문 중 Threads 앱 안에서 연 비율(프로필 링크엔 ref가 없어 ref로는 안 잡힌다)
    threads_ua = neon_query(
        f"select count(*)::int n from \"AnalyticsEvent\" where name='landing_view' and {KDT} >= '{start7}' and \"metaJson\"::json->>'ua'='threads'"
    )[0]["n"]
    orders = neon_query(
        f"select \"paymentId\" pid, amount, status, to_char({KDT},'YYYY-MM-DD') d from \"Order\" where status='PAID' and amount > 0 and {KDT} >= '{start7}'"
    )
    # 토스 테스트 결제(10/20, 사장님 아이폰 3건)는 매출에서 뺀다.
    TEST = ("toss-9f4e2019", "toss-3f1e76d2", "toss-4738803c")
    real = [o for o in orders if not o["pid"].startswith(TEST)]
    return {
        "today": by.get(t, {}), "week": week, "threads_ua_week": threads_ua,
        "pay_today": [o for o in real if o["d"] == t], "pay_week": real,
    }


def collect_health():
    out = []
    try:
        ps = ("Get-ScheduledTask | Where-Object { $_.TaskName -like 'Saju*' -and $_.State -ne 'Disabled' } | ForEach-Object { $i = $_ | Get-ScheduledTaskInfo; "
              "'{0}|{1}|{2}|{3}' -f $_.TaskName, $i.LastTaskResult, $i.LastRunTime.ToString('MM-dd HH:mm'), [int](((Get-Date) - $i.LastRunTime).TotalHours) }")
        res = subprocess.run(["powershell", "-NoProfile", "-Command", ps], capture_output=True, text=True, timeout=60)
        for line in res.stdout.splitlines():
            name, code, when, hours = (line.split("|") + ["", "", "0"])[:4]
            if name in TASK_NAMES:
                recent = int(hours or 0) <= 48
                ok = code.strip() in ("0", "267011", "267014") or not recent
                out.append({"name": TASK_NAMES[name], "ok": ok, "code": code.strip(), "when": when.strip()})
    except Exception as e:
        out.append({"name": "작업 확인", "ok": False, "code": str(e)[:60], "when": ""})
    tokens = []
    for f, label in (("instagram_token.json", "인스타"), ("threads_token.json", "Threads")):
        d = load_json(os.path.join(BASE_DIR, "credentials", f), {})
        if d.get("obtained_at"):
            tokens.append({"name": label, "age": round((time.time() - d["obtained_at"]) / 86400)})
    return {"tasks": out, "tokens": tokens}


# ---------- 판단(신호등·요약) ----------
def judge(th, ig, site):
    best3 = max([p["views"] for p in th["posts"] if p["at"] > datetime.now(KST) - timedelta(days=3)] or [0])
    th_light = "green" if best3 >= 300 else "yellow" if best3 >= 100 else "red"
    ig_best = max([p["views"] for p in ig["posts"]] or [0])
    ig_light = "green" if ig_best >= 500 else "yellow" if ig_best >= 150 else "red"
    paid = len(site["pay_week"])
    site_light = "green" if paid > 0 else "yellow" if site["week"]["saju_start"] >= 10 else "red"
    return {"threads": th_light, "insta": ig_light, "site": site_light, "best3": best3, "ig_best": ig_best}


# ---------- 그리기 ----------
LIGHT = {"green": ("#2f9e5b", "좋음"), "yellow": ("#d39b16", "보통"), "red": ("#d6513a", "주의")}


def esc(s):
    return html.escape(str(s))


def render(now, th, ig, site, health, lights, notes, state):
    prev_f = state.get("threads_followers")
    f_delta = "" if prev_f is None else f"{th['followers'] - prev_f:+d} (어제 대비)"
    w = site["week"]
    pay_w = len(site["pay_week"])
    pay_amt = sum(o["amount"] for o in site["pay_week"])
    summary = notes.get("summary") or (
        f"Threads 최근 3일 최고 조회 {lights['best3']:,}회 · 사이트 실제 방문 7일 {w['landing_view']}명 · 결제 7일 {pay_w}건"
    )
    kpis = [
        ("Threads 팔로워", f"{th['followers']}", f_delta or "기록 시작"),
        ("Threads 최근 3일 최고 조회", f"{lights['best3']:,}", "300↑ 좋음"),
        ("사이트 실제 방문 (7일)", f"{w['landing_view']}", f"생일 입력 {w['saju_start']}명"),
        ("결제 (7일)", f"{pay_w}건", f"{pay_amt:,}원" if pay_amt else "아직 없음"),
    ]
    channels = [
        ("Threads", lights["threads"], f"팔로워 {th['followers']} · 3일 최고 {lights['best3']:,}회", f"사이트 방문의 {round(100 * site['threads_ua_week'] / max(w['landing_view'], 1))}%가 Threads 앱에서"),
        ("인스타그램", lights["insta"], f"팔로워 {ig['followers']} · 최근 5개 최고 {lights['ig_best']:,}회", "반응 거의 없음" if lights["insta"] == "red" else ""),
        ("사이트", lights["site"], f"방문 {w['landing_view']} · 입력 {w['saju_start']} · 상세 버튼 {w['premium_cta_click']}", f"결제 {pay_w}건"),
        ("토스 미니앱", notes.get("toss_light", "yellow"), notes.get("toss", "콘솔 수치는 Claude에게 요청"), notes.get("toss_note", "")),
    ]
    alerts = [f"{t['name']} 실패 ({t['when']}, 코드 {t['code']})" for t in health["tasks"] if not t["ok"]]
    alerts += [f"{t['name']} 연결 키 {t['age']}일째 (60일 만료)" for t in health["tokens"] if t["age"] >= 55]
    alerts += notes.get("alerts", [])
    todos = notes.get("decisions", [])[:3]
    posts = sorted(th["posts"], key=lambda p: p["at"], reverse=True)[:5]

    def dot(light):
        c, label = LIGHT.get(light, LIGHT["yellow"])
        return f'<span class="dot" style="background:{c}"></span><span class="lt" style="color:{c}">{label}</span>'

    rows_ch = "".join(f"<tr><td class='ch'>{esc(n)}</td><td class='st'>{dot(l)}</td><td>{esc(a)}</td><td class='sub'>{esc(b)}</td></tr>" for n, l, a, b in channels)
    rows_po = "".join(f"<tr><td>{p['at']:%m/%d %H:%M}</td><td>{esc(p['title'])}</td><td class='num'>{p['views']:,}</td><td class='num'>{p['replies']}</td></tr>" for p in posts)
    kpi_html = "".join(f"<div class='kpi'><div class='k'>{esc(k)}</div><div class='v'>{esc(v)}</div><div class='s'>{esc(s)}</div></div>" for k, v, s in kpis)
    alert_html = "".join(f"<li>{esc(a)}</li>" for a in alerts) or "<li class='ok'>이상 없음 — 자동 작업·연결 모두 정상</li>"
    todo_html = "".join(f"<li>{esc(t)}</li>" for t in todos) or "<li class='ok'>오늘 결정할 것 없음</li>"
    notes_html = "".join(f"<li>{esc(n)}</li>" for n in notes.get("notes", [])[:3])

    return f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
@page {{ size: A4; margin: 14mm 14mm; }}
body {{ font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif; color: #1d2230; font-size: 12.5pt; margin: 0; }}
h1 {{ font-size: 20pt; margin: 0; }}
.date {{ color: #6b7280; font-size: 11pt; margin-top: 2px; }}
.summary {{ margin: 12px 0 14px; padding: 12px 14px; background: #f4f1fb; border-left: 5px solid #7b5cd6; font-size: 13.5pt; font-weight: 700; line-height: 1.5; }}
.kpis {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }}
.kpi {{ border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; }}
.kpi .k {{ font-size: 9.5pt; color: #6b7280; }}
.kpi .v {{ font-size: 22pt; font-weight: 800; margin: 2px 0; }}
.kpi .s {{ font-size: 9.5pt; color: #6b7280; }}
h2 {{ font-size: 13.5pt; margin: 16px 0 6px; padding-bottom: 4px; border-bottom: 2px solid #1d2230; }}
table {{ width: 100%; border-collapse: collapse; font-size: 11pt; }}
td, th {{ padding: 7px 6px; border-bottom: 1px solid #eceef2; vertical-align: middle; text-align: left; }}
th {{ font-size: 9.5pt; color: #6b7280; font-weight: 600; }}
td.ch {{ font-weight: 800; width: 88px; }}
td.sub {{ color: #6b7280; font-size: 10pt; }}
td.num {{ text-align: right; font-variant-numeric: tabular-nums; width: 60px; }}
.dot {{ display: inline-block; width: 11px; height: 11px; border-radius: 50%; margin-right: 5px; vertical-align: -1px; }}
.lt {{ font-weight: 800; font-size: 10.5pt; }}
td.st {{ white-space: nowrap; width: 62px; }}
.two {{ display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }}
ul {{ margin: 4px 0 0; padding-left: 18px; line-height: 1.6; }}
li.ok {{ color: #2f9e5b; list-style: none; margin-left: -18px; }}
.box {{ border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 12px 10px; }}
.box.warn {{ border-color: #f2c9bf; background: #fff8f6; }}
.box.todo {{ border-color: #d9cdf5; background: #faf8ff; }}
.foot {{ margin-top: 14px; color: #9aa1ab; font-size: 8.5pt; }}
</style></head><body>
<h1>사주랩 일일 보고</h1>
<div class="date">{now:%Y년 %m월 %d일} ({'월화수목금토일'[now.weekday()]}) {now:%H:%M} 기준</div>
<div class="summary">{esc(summary)}</div>
<div class="kpis">{kpi_html}</div>
<h2>채널별 상태</h2>
<table><tr><th>채널</th><th>상태</th><th>숫자</th><th>한마디</th></tr>{rows_ch}</table>
<div class="two">
  <div><h2>⚠️ 확인할 것</h2><div class="box warn"><ul>{alert_html}</ul></div></div>
  <div><h2>✅ 사장님 결정·할 일</h2><div class="box todo"><ul>{todo_html}</ul></div></div>
</div>
<h2>Threads 최근 글</h2>
<table><tr><th>시각</th><th>첫 줄</th><th style="text-align:right">조회</th><th style="text-align:right">답글</th></tr>{rows_po}</table>
{f'<h2>메모</h2><ul>{notes_html}</ul>' if notes_html else ''}
<div class="foot">자동 생성 · 사이트 수치는 사람 방문만(10/18 로봇 제외 이후) · 인스타 수치는 {esc(ig['snap'])} 스냅샷 · 토스 콘솔 수치는 Claude가 메모로 추가 · 테스트 결제 제외</div>
</body></html>"""


def to_pdf(html_text, out_pdf):
    tmp = os.path.join(os.path.dirname(STATE), "daily_report.html")
    os.makedirs(os.path.dirname(tmp), exist_ok=True)
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(html_text)
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer", f"--print-to-pdf={out_pdf}", "file:///" + tmp.replace("\\", "/")],
                   capture_output=True, timeout=120)
    if not os.path.exists(out_pdf):
        raise RuntimeError("PDF 생성 실패(크롬)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-notify", action="store_true")
    args = ap.parse_args()
    now = datetime.now(KST)
    today = now.date()
    notes_all = load_json(NOTES, {})
    # 메모는 오늘·어제 날짜 것만(지난 메모가 계속 남지 않게). 결정·할 일(decisions)은 지울 때까지 유지.
    notes = dict(notes_all)
    if notes_all.get("date") not in (today.isoformat(), (today - timedelta(days=1)).isoformat()):
        for k in ("summary", "notes", "alerts", "toss", "toss_note", "toss_light"):
            notes.pop(k, None)
    state = load_json(STATE, {})
    th = collect_threads(now)
    ig = collect_instagram()
    site = collect_site(today)
    health = collect_health()
    lights = judge(th, ig, site)
    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, f"{today.isoformat()}_사주랩_일일보고.pdf")
    to_pdf(render(now, th, ig, site, health, lights, notes, state), out)
    try:
        import shutil
        shutil.copyfile(out, LATEST)
    except OSError as e:
        print(f"바탕 화면 사본 실패(열려 있을 수 있음): {e}")
    state["threads_followers"] = th["followers"]
    os.makedirs(os.path.dirname(STATE), exist_ok=True)
    with open(STATE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False)
    print(f"저장: {out}")
    if not args.no_notify:
        notify.notify("📄 사주랩 일일 보고", f"바탕 화면 '오늘의_사주랩_보고.pdf' · Threads 3일 최고 {lights['best3']:,}회 · 결제 7일 {len(site['pay_week'])}건", tags=["page_facing_up"])


if __name__ == "__main__":
    main()
