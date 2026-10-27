r"""사주랩 일일 보고서 PDF(데스크톱, 2026-10-23~). 사장님 요청: 채팅 보고는 읽기 어렵다 → 매일 한 장짜리 PDF를 바탕 화면에.

  python scripts/daily_report_pdf.py            # 오늘(KST) 보고서 → 바탕 화면\사주랩_일일보고\YYYY-MM-DD_HHMM_사주랩_일일보고.pdf(작성 시각)
                                                #   + 바탕 화면\오늘의_사주랩_보고.pdf(매일 덮어씀) + ntfy 알림
  python scripts/daily_report_pdf.py --no-notify

보고서 원칙(10/23 사장님 피드백 + 보고서 작성법 조사):
  ① 결론 먼저(맨 위 한 줄) ② 숫자는 항상 "오늘 · 어제 · 누적"으로 나눠서, 기준(목표)과 함께 ③ 숫자마다 판정(신호등)
  ④ 숫자 다음엔 "그래서 무슨 뜻인지 → 무엇을 할지" ⑤ 한 장, 매일 같은 자리 ⑥ 기준 시각·정의는 맨 아래에.
자동으로 모으는 것: Threads(팔로워·글 조회/답글), 인스타(performance/latest.json·followers_log.json — 매일 09:00 스냅샷),
사이트(이벤트 DB: metaJson.ua가 있는 사람 방문만, 10/19부터), 결제(Order: 웹/토스, 9월 이후·테스트 제외), 자동 작업·토큰 상태.
토스 콘솔 수치(사용자·광고·프로모션)와 요약·의미·할 일은 Claude가 scripts/report_notes.json에 적는다.
2·3쪽(10/24~): 채널별 퍼널(Instagram·Threads·토스·검색/직접·기타·해외 ja/en), 토스 입점 현황·30일 과제, 해외판, 핵심 질문.
  report_notes.json의 toss_console(as_of_date 포함, 2일 이상 지나면 '갱신 필요' 표시)·toss_status·toss_plan·toss_value·
  global_status·qa·channel_summary는 날짜가 지나도 지우지 않는 고정 항목이다.
4쪽(10/24~): 할 일 체크리스트 — report_notes.json의 checklist(group·title·detail·say·when·due·done, 고정 항목).
  due가 지났는데 done이 아니면 '지남', 2일 안이면 '곧'으로 표시. 끝난 항목은 done: true로 두거나 지운다.
작업 스케줄러: SajuDailyReportPdf 매일 20:00(10/24 사장님 요청으로 21:50 → 20:00).
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


def _desktop_dir() -> str:
    """윈도우가 아는 진짜 바탕 화면. OneDrive가 바탕 화면을 가져간 컴퓨터(노트북)는 ~/Desktop이 아니라
    OneDrive\\바탕 화면이라, ~/Desktop으로 고정하면 사장님 눈에 안 보이는 새 폴더에 PDF가 만들어진다."""
    try:
        import ctypes
        buf = ctypes.create_unicode_buffer(260)
        if ctypes.windll.shell32.SHGetFolderPathW(None, 0x0010, None, 0, buf) == 0 and buf.value:  # CSIDL_DESKTOPDIRECTORY
            return buf.value
    except Exception:
        pass
    return os.path.join(os.path.expanduser("~"), "Desktop")


DESKTOP = _desktop_dir()
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

_ORDER_HAS_CURRENCY = None


def order_currency_col():
    """주문 SQL에 넣을 통화 칸. 해외판(USD·JPY) 주문이 생기면 금액을 원화와 더하면 안 된다 — 그래서 원화 주문만 센다.
    통화 칸(Order.currency)은 해외 결제 배포 때 DB에 추가되므로, 아직 없는 DB에서도 이 보고서가 멈추지 않게 칸이 있는지 먼저 확인한다."""
    global _ORDER_HAS_CURRENCY
    if _ORDER_HAS_CURRENCY is None:
        rows = neon_query("select 1 x from information_schema.columns where table_name='Order' and column_name='currency'")
        _ORDER_HAS_CURRENCY = bool(rows)
    return "currency" if _ORDER_HAS_CURRENCY else "'KRW' as currency"
THREADS_POST_GOAL = 300
TOSS_BREAKEVEN = 15
# 2·3쪽(10/24 사장님: 매일 20시 종합 보고 — 채널별 퍼널·토스 입점·해외판). 채널은 사이트 이벤트의 ua(앱 구분)와 ref(유입 링크)로 나눈다.
CHANNELS = [("instagram", "Instagram"), ("threads", "Threads"), ("search", "검색·직접"), ("other", "기타 외부")]
FUNNEL = ["landing_view", "saju_start", "saju_complete", "premium_cta_click", "checkout_start", "payment_success"]
GLOBAL_LOCALES = [("ja", "일본어 (ja)"), ("en", "영어 (en)")]  # 국기 이모지는 윈도우 크롬 PDF에서 'JP' 글자로 깨진다


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
        f"select \"paymentId\" pid, amount, {order_currency_col()}, to_char({KDT},'YYYY-MM-DD') d from \"Order\" where status='PAID' and amount > 0 and {KDT} >= '{PAID_SINCE}'"
    )
    real = [o for o in orders if not o["pid"].startswith(TEST_ORDERS) and o["currency"] == "KRW"]
    web = [o for o in real if not o["pid"].startswith("toss-")]
    toss = [o for o in real if o["pid"].startswith("toss-")]

    def pay(lst):
        return {"t": sum(1 for o in lst if o["d"] == t), "y": sum(1 for o in lst if o["d"] == y),
                "n": len(lst), "amt": sum(o["amount"] for o in lst)}

    return {"t": by.get(t, {}), "y": by.get(y, {}), "cum": cum, "all_start": all_start,
            "ua_threads": ua_threads, "web": pay(web), "toss": pay(toss)}


def channel_of(ua, ref):
    """사이트 이벤트 한 건의 유입 채널. ref는 첫 화면(landing_view)에만 있어 이후 단계는 ua(어느 앱 안에서 열었나)로 나눈다."""
    ref = ref or ""
    if ref.startswith("ig") or ua in ("instagram", "facebook"):
        return "instagram"
    if ref.startswith(("th", "threads")) or ua == "threads":
        return "threads"
    if ua == "naver" or ref.startswith(("google", "naver", "search")) or (ua in ("desktop", "mobile", "unknown") and not ref):
        return "search"
    return "other"  # 카카오·공유 링크(share_*)·배너 등


def collect_channels(today):
    """최근 7일(오늘 포함) 사람 이벤트를 채널×퍼널 단계로 센다. 결제·환불 금액은 Order 기준(채널을 알 수 없어 합계만)."""
    since = (today - timedelta(days=6)).isoformat()
    rows = neon_query(
        f"select name, \"metaJson\"::json->>'ua' ua, \"metaJson\"::json->>'ref' ref, count(*)::int n from \"AnalyticsEvent\" "
        f"where {KDT} >= '{since}' and \"metaJson\"::json->>'ua' is not null and name in ({','.join(repr(n) for n in FUNNEL)}) group by 1,2,3"
    )
    table = {c: dict.fromkeys(FUNNEL, 0) for c, _ in CHANNELS}
    for r in rows:
        table[channel_of(r["ua"], r["ref"])][r["name"]] += r["n"]
    orders = neon_query(
        f"select \"paymentId\" pid, amount, {order_currency_col()}, status from \"Order\" where amount > 0 and {KDT} >= '{since}' and status in ('PAID','CANCELED')"
    )
    real = [o for o in orders if not o["pid"].startswith(TEST_ORDERS) and o["currency"] == "KRW"]
    web_paid = [o for o in real if o["status"] == "PAID" and not o["pid"].startswith("toss-")]
    refunds = [o for o in real if o["status"] == "CANCELED"]
    return {"since": since, "table": table, "web_rev": sum(o["amount"] for o in web_paid), "web_n": len(web_paid),
            "refund_n": len(refunds), "refund_amt": sum(o["amount"] for o in refunds)}


def collect_global():
    """해외판(/ja·/en): 사이트 global_* 이벤트(출시 이후 누적·최근 7일), 오픈 알림 신청, Threads 두 계정."""
    rows = neon_query(
        f"select name, \"metaJson\"::json->>'locale' loc, ({KDT})::date >= (now() at time zone 'Asia/Seoul')::date - 6 recent, count(*)::int n "
        f"from \"AnalyticsEvent\" where name like 'global_%' group by 1,2,3"
    )
    ev = {loc: {"all": {}, "7d": {}} for loc, _ in GLOBAL_LOCALES}
    for r in rows:
        if r["loc"] not in ev:
            continue
        ev[r["loc"]]["all"][r["name"]] = ev[r["loc"]]["all"].get(r["name"], 0) + r["n"]
        if r["recent"]:
            ev[r["loc"]]["7d"][r["name"]] = ev[r["loc"]]["7d"].get(r["name"], 0) + r["n"]
    wait = neon_query("select split_part(src, ':', 1) loc, count(*)::int n from \"WaitlistSignup\" where src like 'ja:%' or src like 'en:%' group by 1")
    waits = {r["loc"]: r["n"] for r in wait}
    accounts = {}
    saved = (threads_api.TOKEN_PATH, threads_api.TOKEN_TXT_PATH)
    for loc, _ in GLOBAL_LOCALES:
        try:
            threads_api.use_account(loc)
            acc = threads_api.get_account()
            posts = []
            for t in threads_api.list_my_threads(7):
                try:
                    m = threads_api.get_insights(t["id"])
                except Exception:
                    m = {}
                posts.append({"views": m.get("views") or 0, "replies": m.get("replies") or 0})
            accounts[loc] = {"followers": acc.get("followers") or 0, "posts": len(posts),
                             "views": sum(p["views"] for p in posts), "replies": sum(p["replies"] for p in posts)}
        except (Exception, SystemExit) as e:
            # get_token()은 토큰 파일이 없으면 SystemExit로 끝난다. 해외판 토큰은 데스크톱에만 있어서 다른 컴퓨터에서는
            # 이 칸만 "토큰 오류"로 두고 보고서 전체는 만들어야 한다(docs/SYNC_CHECKLIST.md 3번).
            accounts[loc] = {"error": str(e)[:80]}
        finally:
            threads_api.TOKEN_PATH, threads_api.TOKEN_TXT_PATH = saved
    return {"events": ev, "waits": waits, "accounts": accounts}


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


def render(now, th, ig, site, health, notes, pages23=""):
    today = now.date()
    yday = today - timedelta(days=1)
    toss = notes.get("toss") or notes.get("toss_console") or {}
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
.pb {{ page-break-before: always; }}
table.small td, table.small th {{ font-size: 9pt; padding: 4px 5px; }}
td small {{ color: #6b7280; font-weight: 400; }}
.tag {{ display: inline-block; border: 1px solid; border-radius: 4px; font-size: 7.5pt; font-weight: 700; padding: 0 4px; margin-right: 2px; }}
.two {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }}
table.stages td {{ width: 25%; text-align: center; border: 1px solid #e5e7eb; font-size: 9.5pt; line-height: 1.35; }}
td.st2 {{ white-space: nowrap; font-weight: 700; font-size: 8.5pt; }}
ul.plain {{ font-size: 9.5pt; }}
table.check td {{ vertical-align: top; font-size: 10pt; line-height: 1.4; }}
td.cb {{ width: 18px; font-size: 13pt; }}
tr.done td {{ color: #9aa1ab; text-decoration: line-through; }}
.say {{ display: inline-block; background: #f3efe6; border-radius: 4px; padding: 0 5px; font-size: 9pt; margin-top: 2px; }}
.qa {{ font-size: 9.5pt; line-height: 1.45; margin: 5px 0; padding: 5px 8px; border-left: 3px solid #d9cdf5; background: #fcfbff; }}
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
{pages23}
</body></html>"""


KIND_STYLE = {"확인": "#2f9e5b", "가설": "#d39b16", "확인 필요": "#d6513a"}


def kind_tag(kind):
    c = KIND_STYLE.get(kind, "#9aa1ab")
    return f'<span class="tag" style="border-color:{c};color:{c}">{esc(kind)}</span>'


def pct(a, b):
    return "–" if not b else f"{a / b * 100:.0f}%"


def render_pages23(now, th, ig, ch, gl, notes):
    """2쪽: 채널별 퍼널. 3쪽: 토스 입점·해외판·핵심 질문. 숫자가 없는 칸은 실적처럼 채우지 않고 '–'와 측정 방법을 적는다."""
    today = now.date()
    t = ch["table"]
    tc = notes.get("toss_console") or {}
    stale = ""
    if tc.get("as_of_date"):
        age = (today - date.fromisoformat(tc["as_of_date"])).days
        stale = " · ⚠️ 갱신 필요" if age >= 2 else ""
    ig_views = sum(p["views"] for p in ig["posts"])
    impressions = {"instagram": f"{ig_views:,} (최근 글 {len(ig['posts'])}개)", "threads": f"{th['week_views']:,} (7일 글)",
                   "search": "– (서치콘솔 로그인 필요)", "other": "–"}
    costs = {"instagram": "광고비 0원", "threads": "광고비 0원", "search": "0원", "other": "0원"}
    body = ""
    for key, label in CHANNELS:
        r = t[key]
        body += (f"<tr><td class='g'>{esc(label)}</td><td class='n'>{esc(impressions[key])}</td><td class='n'>{r['landing_view']:,}</td>"
                 f"<td class='n'>{r['saju_start']:,}</td><td class='n'>{r['saju_complete']:,}</td><td class='n'>{r['premium_cta_click']:,}</td>"
                 f"<td class='n'>{r['payment_success']:,}</td><td class='n'>{pct(r['payment_success'], r['landing_view'])}</td><td>{esc(costs[key])}</td></tr>")
    tot = {k: sum(t[c][k] for c, _ in CHANNELS) for k in FUNNEL}
    body += (f"<tr class='grp'><td class='g'>웹 합계</td><td class='n'>–</td><td class='n'>{tot['landing_view']:,}</td><td class='n'>{tot['saju_start']:,}</td>"
             f"<td class='n'>{tot['saju_complete']:,}</td><td class='n'>{tot['premium_cta_click']:,}</td><td class='n'>{ch['web_n']}건 · {ch['web_rev']:,}원</td>"
             f"<td class='n'>{pct(ch['web_n'], tot['landing_view'])}</td><td>환불 {ch['refund_n']}건 · {ch['refund_amt']:,}원</td></tr>")
    toss_row = (f"<tr class='grp'><td class='g'>토스<br><small>콘솔 {esc(tc.get('events_window', '-'))}</small></td><td class='n'>– (콘솔에 노출 지표 없음)</td>"
                f"<td class='n'>{num(tc.get('users_window'))}</td><td class='n'>{num(tc.get('form_start'))}</td><td class='n'>{num(tc.get('form_done'))}</td>"
                f"<td class='n'>{num(tc.get('buy_click'))}</td><td class='n'>{num(tc.get('paid'), '건')}</td><td class='n'>{pct(tc.get('paid') or 0, tc.get('users_window') or 0)}</td>"
                f"<td>프로모션 {num(tc.get('promo_spent'), '원')} · 결제 0이면 CAC 계산 불가</td></tr>")
    gl_rows = ""
    for loc, label in GLOBAL_LOCALES:
        e = gl["events"][loc]["7d"]
        a = gl["accounts"].get(loc, {})
        imp = f"{a.get('views', 0):,} (Threads)" if "error" not in a else "– (토큰 오류)"
        gl_rows += (f"<tr><td class='g'>{label}</td><td class='n'>{imp}</td><td class='n'>{e.get('global_landing_view', 0):,}</td><td class='n'>–</td>"
                    f"<td class='n'>{e.get('global_saju_complete', 0):,}</td><td class='n'>알림 {gl['waits'].get(loc, 0)}명</td><td class='n'>결제 없음</td><td class='n'>–</td><td>광고비 0원</td></tr>")

    def li(items, key="text"):
        return "".join(f"<li>{kind_tag(x.get('kind', '확인'))} {esc(x[key])}</li>" for x in items) or "<li>–</li>"

    stages = "".join(f"<td><b>{'✅' if s.get('done') else '❌'} {esc(s['stage'])}</b><br><small>{esc(s.get('detail', ''))}</small></td>"
                     for s in notes.get("toss_status", []))
    plan = "".join(f"<tr><td>{esc(p['item'])}</td><td class='st2'>{esc(p['status'])}</td><td><small>{esc(p.get('note', ''))}</small></td></tr>"
                   for p in notes.get("toss_plan", []))
    acc_rows = ""
    for loc, label in GLOBAL_LOCALES:
        a = gl["accounts"].get(loc, {})
        ev = gl["events"][loc]["all"]
        acc_rows += (f"<tr><td class='g'>{label}</td><td class='n'>{num(a.get('followers'), '명')}</td><td class='n'>{a.get('posts', 0)}개</td>"
                     f"<td class='n'>{a.get('views', 0):,} · {a.get('replies', 0)}</td><td class='n'>{ev.get('global_landing_view', 0):,}</td>"
                     f"<td class='n'>{ev.get('global_saju_complete', 0):,}</td><td class='n'>{gl['waits'].get(loc, 0)}명</td></tr>")
    qa = "".join(f"<div class='qa'><b>Q. {esc(x['q'])}</b> {kind_tag(x.get('kind', '확인'))}<br>{esc(x['a'])}</div>" for x in notes.get("qa", []))

    return f"""
<div class="pb"></div>
<div class="top"><h1>채널별 성과</h1><div class="date">최근 7일 ({ch['since'][5:].replace('-', '/')}~{today:%m/%d}) · 사람 방문만</div></div>
<div class="summary"><small>채널 결론</small>{esc(notes.get('channel_summary') or '채널별 숫자를 아래 표로 확인하세요.')}</div>
<h2>퍼널 — 노출 → 방문 → 무료 시작 → 무료 완료 → 상세 도달 → 결제</h2>
<table class="small"><tr><th>채널</th><th class="n">노출</th><th class="n">방문</th><th class="n">무료 시작</th><th class="n">무료 완료</th><th class="n">상세 도달</th><th class="n">결제</th><th class="n">방문→결제</th><th>비용 · CAC</th></tr>
{body}{toss_row}
<tr class='grp'><td class='g' colspan='9'>해외판 (최근 7일, 결제 기능 없음)</td></tr>{gl_rows}</table>
<div class="foot">채널 분류: 사이트 이벤트의 앱 구분(ua)과 유입 링크(ref). Instagram = 인스타·페이스북 앱 안 또는 ig_ 링크, Threads = Threads 앱 안 또는 th_/threads 링크,
검색·직접 = 네이버 앱·검색 링크·링크 없는 브라우저 방문(운영자 확인 포함), 기타 = 카카오·공유 링크 등. 무료 시작 이후 단계는 링크 정보가 없어 앱 구분으로만 나눈다.
토스 줄은 앱인토스 콘솔 수치({esc(tc.get('as_of', '미입력'))} 기준{stale}, 이벤트는 콘솔의 최근 {esc(tc.get('events_window', '-'))} 누적)로 사이트 방문과 다른 단위다 — 토스 앱 안 진입은 사이트 방문에 포함되지 않는다.
노출: Threads = 최근 7일 글 조회 합, Instagram = 최근 게시물 조회(09:00 스냅샷). 검색 노출은 구글 서치콘솔·네이버 서치어드바이저 로그인 권한이 있어야 잴 수 있다.
결제는 9월 이후 실결제(시험 제외). 채널별 결제는 결제 성공 이벤트의 앱 구분 기준. CAC = 채널 비용 ÷ 결제 건수(결제 0이면 계산하지 않음). 개인정보(생년월일·이메일·아이디)는 집계에 쓰지 않는다.</div>

<div class="pb"></div>
<div class="top"><h1>토스 입점 · 해외판</h1><div class="date">토스 콘솔 {esc(tc.get('as_of', '미입력'))} 기준{stale}</div></div>
<h2>토스 입점 현황 — 등록 · 심사 · 출시 · 매출 구분</h2>
<table class="stages"><tr>{stages}</tr></table>
<div class="two">
  <div class="box mean"><h3>토스 채널의 가치와 위험</h3><ul>{li(notes.get('toss_value', []))}</ul></div>
  <div class="box todo"><h3>토스 30일 과제</h3><table class="small">{plan or '<tr><td>–</td></tr>'}</table></div>
</div>
<h2>해외판 — 시작 {esc(notes.get('global_start', '10/24'))}</h2>
<table class="small"><tr><th>계정</th><th class="n">팔로워</th><th class="n">최근 글</th><th class="n">조회 · 답글</th><th class="n">사이트 방문(누적)</th><th class="n">무료 결과(누적)</th><th class="n">오픈 알림</th></tr>{acc_rows}</table>
<ul class="plain">{li(notes.get('global_status', []))}</ul>
<h2>핵심 질문</h2>
{qa or '<div class="qa">–</div>'}
<div class="foot">태그: <b style="color:#2f9e5b">확인</b> = 콘솔·DB·API로 확인한 사실, <b style="color:#d39b16">가설</b> = 데이터로 검증 전인 판단, <b style="color:#d6513a">확인 필요</b> = 아직 확인하지 못한 항목(추정하지 않음).
토스 콘솔 수치는 로그인이 필요해 자동 수집되지 않고 Claude가 콘솔에서 옮겨 적는다(반영이 하루가량 늦음). 해외판 Threads 수치는 API 자동 수집.</div>"""


CHECK_GROUPS = [("사장님", "사장님이 직접 할 일"), ("Claude에게 말하기", "Claude에게 말만 하면 되는 일"), ("예정", "예정 (날짜 되면 Claude가 챙김)")]


def render_checklist(now, notes):
    """4쪽: 할 일 체크리스트(report_notes.json checklist). 오른쪽 화면 체크리스트와 같은 내용."""
    items = notes.get("checklist") or []
    if not items:
        return ""
    today = now.date()
    body = ""
    for key, title in CHECK_GROUPS:
        rows = ""
        for x in [i for i in items if i.get("group") == key]:
            flag = ""
            if x.get("due") and not x.get("done"):
                left = (date.fromisoformat(x["due"]) - today).days
                flag = " <b style='color:#d6513a'>⚠️ 지남</b>" if left < 0 else " <b style='color:#d39b16'>곧</b>" if left <= 2 else ""
            say = f"<br><span class='say'>{esc(x['say'])}</span>" if x.get("say") else ""
            done = " class='done'" if x.get("done") else ""
            rows += (f"<tr{done}><td class='cb'>{'☑' if x.get('done') else '☐'}</td><td><b>{esc(x['title'])}</b><br>"
                     f"<small>{esc(x.get('detail', ''))}</small>{say}</td><td class='st2'>{esc(x.get('when', ''))}{flag}</td></tr>")
        if rows:
            body += f"<h2>{esc(title)}</h2><table class='check'>{rows}</table>"
    n_done = sum(1 for i in items if i.get("done"))
    return f"""
<div class="pb"></div>
<div class="top"><h1>할 일 체크리스트</h1><div class="date">{n_done} / {len(items)} 완료 · {now:%m/%d %H:%M} 기준</div></div>
{body}
<div class="foot">체크리스트는 Claude가 report_notes.json에 관리한다. 끝난 일은 "OO 했어"라고 말하면 ☑로 바뀌고, 날짜가 지난 일은 '지남'으로 표시된다.</div>"""


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
    # 2·3쪽은 실패해도 1쪽 보고는 나가야 하므로 따로 감싼다.
    try:
        pages23 = render_pages23(now, th, ig, collect_channels(today), collect_global(), notes)
    except Exception as e:
        print(f"2·3쪽 생성 실패: {e}")
        pages23 = f"<div class='pb'></div><h2>채널·토스·해외판</h2><p>이번 회차는 집계에 실패했습니다: {esc(str(e)[:200])}</p>"
    try:
        pages23 += render_checklist(now, notes)
    except Exception as e:
        print(f"체크리스트 생성 실패: {e}")
    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, f"{now:%Y-%m-%d_%H%M}_사주랩_일일보고.pdf")
    to_pdf(render(now, th, ig, site, health, notes, pages23), out)
    try:
        shutil.copyfile(out, LATEST)
    except OSError as e:
        print(f"바탕 화면 사본 실패(열려 있을 수 있음): {e}")
    os.makedirs(os.path.dirname(STATE), exist_ok=True)
    with open(STATE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False)
    print(f"저장: {out}")
    # 데스크톱·노트북이 같은 20:00에 각자 PDF를 만들므로(각 컴퓨터 바탕 화면용) 알림은 먼저 만든 한 대만 보낸다.
    marker_rel = os.path.join("scripts", "posted_state", "daily_report", f"{today.isoformat()}.json")
    if not args.no_notify:
        import git_sync  # 이 파일의 나머지는 git을 쓰지 않아 여기서만 가져온다

        git_sync.git_pull(BASE_DIR)
        if os.path.exists(os.path.join(BASE_DIR, marker_rel)):
            print("다른 컴퓨터가 오늘 보고 알림을 이미 보냈습니다(PDF만 저장).")
            return
        os.makedirs(os.path.dirname(os.path.join(BASE_DIR, marker_rel)), exist_ok=True)
        with open(os.path.join(BASE_DIR, marker_rel), "w", encoding="utf-8") as f:
            json.dump({"at": now.isoformat(), "host": os.environ.get("COMPUTERNAME")}, f)
        if not git_sync.git_commit_push(BASE_DIR, [marker_rel], f"report: 일일 보고 {today.isoformat()}"):
            git_sync.git_pull(BASE_DIR)  # push가 밀렸으면 다른 컴퓨터가 먼저 올린 것 — 알림은 그쪽 몫
            print("다른 컴퓨터가 먼저 보고 알림을 보냈습니다.")
            return
        tv, _, tn = th["today"]
        notify.notify("📄 사주랩 일일 보고", f"바탕 화면 '오늘의_사주랩_보고.pdf' · 오늘 사이트 방문 {site['t'].get('landing_view', 0)}명 · "
                      f"실결제 누적 {site['web']['n'] + site['toss']['n']}건", tags=["page_facing_up"])


if __name__ == "__main__":
    main()
