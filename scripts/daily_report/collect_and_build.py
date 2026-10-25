# -*- coding: utf-8 -*-
"""일일 운영 보고서 자동 생성(간소판): 수집 가능한 수치를 모아 data JSON을 만들고 PDF를 생성한 뒤 폰(ntfy)으로 알린다.
- 자동 수집: 유튜브(Data API)·인스타 인사이트·쓰레드/릴스 게시 기록(git)·웹 결제(DB)·스케줄 상태
- 수집 못 하는 것(토스 콘솔 수치 등 로그인 필요)은 '확인 못 함'으로 표시하고, 사장님이 Claude에게 요청하면 전체판으로 다시 만든다.
- 고정 문구(계획·결정·한계 중 고정분)는 report_static.json에서 읽는다(Claude가 상황에 맞게 갱신).
사용: python collect_and_build.py [YYYY-MM-DD]"""
import json, os, re, subprocess, sys
from datetime import datetime, timedelta, timezone

sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
SAJU = r"C:\saju-app"
FACT = r"C:\shorts_auto"
KST = timezone(timedelta(hours=9))
DAYS = "월화수목금토일"
sys.path.insert(0, HERE)
import make_daily_report as R  # noqa: E402


def run(cmd, cwd=None, timeout=150):
    try:
        return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="ignore", timeout=timeout).stdout
    except Exception:
        return ""


def git_since(repo, since):
    run(["git", "fetch", "-q", "origin"], cwd=repo, timeout=60)
    out = run(["git", "log", "origin/main", f"--since={since}", "--format=%ad|%s", "--date=format:%H:%M"], cwd=repo)
    return [l.split("|", 1) for l in out.splitlines() if "|" in l and "lock" not in l.split("|", 1)[1].lower()]


def youtube():
    try:
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build
        creds = Credentials.from_authorized_user_file(os.path.join(FACT, "credentials", "token.json"))
        yt = build("youtube", "v3", credentials=creds)
        ch = yt.channels().list(part="statistics,contentDetails", mine=True).execute()["items"][0]
        up = ch["contentDetails"]["relatedPlaylists"]["uploads"]
        items = yt.playlistItems().list(part="contentDetails", playlistId=up, maxResults=8).execute()["items"]
        ids = [i["contentDetails"]["videoId"] for i in items]
        vs = yt.videos().list(part="statistics,snippet", id=",".join(ids)).execute()["items"]
        rows = []
        for v in vs:
            t = datetime.fromisoformat(v["snippet"]["publishedAt"].replace("Z", "+00:00")).astimezone(KST)
            s = v["statistics"]
            rows.append((t, v["snippet"]["title"].split("#")[0].strip()[:40], int(s.get("viewCount", 0)), int(s.get("likeCount", 0))))
        rows.sort(reverse=True)
        return {"subs": ch["statistics"].get("subscriberCount"), "views": ch["statistics"].get("viewCount"), "videos": ch["statistics"].get("videoCount"), "rows": rows}
    except Exception as e:
        return {"error": str(e)[:120]}


def insights():
    out = run([sys.executable, os.path.join(SAJU, "scripts", "fetch_insights.py")], cwd=SAJU, timeout=200)
    reels = []
    for l in out.splitlines():
        m = re.match(r"릴스 Day (\d+) \((R\d+)\): (\{.*\})", l)
        if m:
            try:
                d = eval(m.group(3), {"__builtins__": {}})  # 출력은 우리 스크립트의 dict 문자열
                reels.append((int(m.group(1)), m.group(2), d.get("views"), d.get("avg_watch_sec")))
            except Exception:
                pass
    fol = None
    try:
        f = json.load(open(os.path.join(SAJU, "scripts", "performance", "followers_log.json"), encoding="utf-8"))
        fol = f[-1], (f[-2] if len(f) > 1 else None)
    except Exception:
        pass
    return reels, fol


def db_orders():
    code = r'''
import sys, json
sys.path.insert(0, r"%s")
from dotenv import load_dotenv
load_dotenv(r"%s")
import fetch_insights as fi
a = fi.neon_query("""SELECT count(*) n, count(*) FILTER (WHERE status='PAID' AND amount>0) paid, coalesce(sum(amount) FILTER (WHERE status='PAID'),0) amt, count(*) FILTER (WHERE status='FAILED') failed FROM "Order" WHERE "createdAt" > now() - interval '7 days' AND "paymentId" NOT LIKE 'toss-%%'""")
b = fi.neon_query("""SELECT count(*) n, count(*) FILTER (WHERE "createdAt" > now() - interval '24 hours') d1 FROM "Order" WHERE "paymentId" LIKE 'toss-%%' AND status='PAID'""")
print(json.dumps({"web": a[0], "toss": b[0]}))
''' % (os.path.join(SAJU, "scripts"), os.path.join(SAJU, ".env.local"))
    out = run([sys.executable, "-c", code], cwd=SAJU, timeout=120).strip().splitlines()
    try:
        return json.loads(out[-1])
    except Exception:
        return None


def web_funnel():
    """웹사이트 방문·결제 이벤트(AnalyticsEvent): 최근 24시간/7일 landing_view, payment_success."""
    code = r'''
import sys, json
sys.path.insert(0, r"%s")
from dotenv import load_dotenv
load_dotenv(r"%s")
import fetch_insights as fi
q = lambda name, h: fi.neon_query("select count(*)::int n from \"AnalyticsEvent\" where name = '%%s' and \"createdAt\" > now() - interval '%%s'" %% (name, h))[0]["n"]
print(json.dumps({"visit_24h": q("landing_view", "24 hours"), "visit_7d": q("landing_view", "7 days"), "paid_7d": q("payment_success", "7 days")}))
''' % (os.path.join(SAJU, "scripts"), os.path.join(SAJU, ".env.local"))
    out = run([sys.executable, "-c", code], cwd=SAJU, timeout=120).strip().splitlines()
    try:
        return json.loads(out[-1])
    except Exception:
        return None


def toss_refund_check():
    try:
        sys.path.insert(0, HERE)
        import refund_sync
        return refund_sync.check()
    except Exception:
        return None


def main():
    today = datetime.now(KST)
    # 21:40에 컴퓨터가 꺼져 있으면 다음 날 아침에 밀려 실행된다(StartWhenAvailable). 정오 전 실행은 어제 보고서로 만든다.
    base = today - timedelta(days=1) if today.hour < 12 else today
    ds = sys.argv[1] if len(sys.argv) > 1 else base.strftime("%Y-%m-%d")
    since = f"{ds} 00:00"
    static = json.load(open(os.path.join(HERE, "report_static.json"), encoding="utf-8"))
    unknown = list(static.get("unknown", []))

    yt = youtube()
    reels, fol = insights()
    saju_log = git_since(SAJU, since)
    fact_log = git_since(FACT, since)
    orders = db_orders()
    funnel = web_funnel()
    refunds = toss_refund_check()

    # --- 유튜브
    factlab = {"summary": [], "recent": [], "insight": []}
    uploads = [m for t, m in fact_log if "유튜브 업로드 완료" in m]
    if uploads:
        for t, m in fact_log:
            if "유튜브 업로드 완료" in m:
                factlab["summary"].append(f"{t} 쇼츠 업로드: {re.sub(r'^mark: ', '', m).split(' 유튜브')[0]}")
    else:
        factlab["summary"].append("오늘 업로드 기록이 없습니다(주말·휴무이거나 대기열 확인 필요).")
    if "rows" in yt:
        factlab["summary"].append(f"채널: 구독자 {yt['subs']}명 · 영상 {yt['videos']}개 · 누적 조회 {int(yt['views']):,}회.")
        for t, title, v, lk in yt["rows"]:
            factlab["recent"].append([t.strftime("%m/%d %H:%M"), title, f"{v:,}", str(lk)])
        tot = sum(r[2] for r in yt["rows"]) or 1
        top = max(yt["rows"], key=lambda r: r[2])
        factlab["insight"].append(f"최근 {len(yt['rows'])}편 합계 {tot:,}회 중 「{top[1][:18]}…」 1편이 {top[2] * 100 // tot}%를 차지합니다.")
    else:
        factlab["recent"].append(["-", "유튜브 조회 실패: " + yt.get("error", ""), "-", "-"])
        unknown.append("유튜브 조회수(API 오류).")

    # --- 릴스
    reel_posts = [m for t, m in saju_log if m.startswith("posted: reel")]
    reels_sec = {"summary": [], "recent": [], "insight": []}
    reels_sec["summary"].append(("오늘 릴스 업로드: " + ", ".join(reel_posts)) if reel_posts else "오늘 릴스 업로드 기록이 없습니다.")
    for day, rid, v, w in reels[-6:]:
        reels_sec["recent"].append([f"Day {day}", rid, str(v), "-" if w in (None, 0, 0.0) else f"{w:.2f}"])
    if not reels_sec["recent"]:
        reels_sec["recent"].append(["-", "인사이트 조회 실패", "-", "-"])
        unknown.append("인스타 릴스 조회수(인사이트 조회 실패).")
    else:
        ws = [w for _, _, _, w in reels[-6:] if w]
        if ws:
            reels_sec["insight"].append(f"최근 릴스 평균 시청 {sum(ws) / len(ws):.1f}초. 첫 3초 이탈이 크면 앞부분 개선이 필요합니다.")
    if fol:
        reels_sec["summary"].append(f"인스타그램 팔로워 {fol[0]['followers']}명, 게시물 {fol[0]['media_count']}개.")

    # --- 쓰레드
    th_replies = [m for t, m in saju_log if "풀이 답글" in m]
    th_posts = [m for t, m in saju_log if m.startswith("posted: threads")]
    threads = {"summary": [], "linktest": [], "insight": []}
    threads["summary"].append((th_replies[-1] if th_replies else "오늘 풀이 답글 자동 게시 기록이 없습니다."))
    threads["summary"].append(("오늘 게시 글: " + ", ".join(th_posts)) if th_posts else "오늘 게시 글 기록은 아직 없습니다(21:00 글은 보고서 생성 후 발행될 수 있음).")
    threads["linktest"] = static["threads"]["linktest"]
    threads["insight"] = static["threads"]["insight"]

    # --- 인스타
    ig = {"summary": []}
    if fol:
        prev = f"(이전 기록 {fol[1]['date']} {fol[1]['followers']}명)" if fol[1] else ""
        ig["summary"].append(f"팔로워 {fol[0]['followers']}명 {prev}, 게시물 {fol[0]['media_count']}개.")
    card = [m for t, m in saju_log if m.startswith("posted: cardnews")]
    ig["summary"].append(("오늘 카드뉴스: " + ", ".join(card)) if card else "오늘 카드뉴스 발행 기록은 없습니다(약 3일에 1회 주기).")
    ig["summary"] += static["instagram"]["extra"]

    # --- 토스·웹 결제
    facts = [list(x) for x in static["toss"]["facts"]]
    web_status, web_text = "대기", "DB 조회 실패"
    if orders:
        w, t = orders["web"], orders["toss"]
        web_text = f"최근 7일 웹 주문 {w['n']}건(결제완료 유료 {w['paid']}건, 실패 {w['failed']}건)"
        web_status = "정상" if int(w["paid"]) > 0 else "주의"
        facts.append(["웹 결제(자동 조회)", web_text])
        facts.append(["토스 인앱 결제(자동 조회)", f"누적 결제 {t['n']}건(최근 24시간 {t['d1']}건) — 테스트 결제 포함"])
    else:
        unknown.append("웹·토스 결제 건수(DB 조회 실패).")
    if funnel:
        facts.append(["웹사이트 방문(자동 조회)", f"최근 24시간 {funnel['visit_24h']}회 · 7일 {funnel['visit_7d']}회 · 결제 성공 이벤트 7일 {funnel['paid_7d']}건"])
    if refunds is not None:
        n_ref = sum(1 for x in refunds if x["toss"] == "REFUNDED")
        n_pending = sum(1 for x in refunds if x["toss"] == "REFUNDED" and x["server"] == "PAID")
        facts.append(["토스 환불 점검(자동 조회)", f"토스 주문 {len(refunds)}건 중 환불 확정 {n_ref}건" + (f" — 서버 정리 필요 {n_pending}건(refund_sync.py --apply)" if n_pending else "")])
    unknown.append("토스 콘솔 수치(사용자·광고·문의)는 로그인이 필요해 자동판에서는 확인하지 못했습니다.")

    overview = [
        ["데일리 팩트랩(유튜브)", f"오늘 업로드 {len(uploads)}편" + (f" · 구독자 {yt['subs']}명" if 'subs' in yt else ""), "정상" if uploads else "주의"],
        ["사주랩 릴스(인스타)", f"오늘 업로드 {len(reel_posts)}건", "정상" if reel_posts else "주의"],
        ["쓰레드", f"풀이 답글 {th_replies[-1].split('답글')[1].strip() if th_replies else '기록 없음'} · 게시 글 {len(th_posts)}건", "정상" if th_replies or th_posts else "주의"],
        ["인스타그램", (f"팔로워 {fol[0]['followers']}명" if fol else "팔로워 조회 실패") + f" · 카드뉴스 {len(card)}건", "정상" if fol else "미확인"],
        ["토스 미니앱", static["toss"]["status_text"], static["toss"]["status"]],
        ["웹 결제", web_text, web_status],
    ]

    data = {
        "date": ds,
        "date_label": f"{ds[:4]}년 {int(ds[5:7])}월 {int(ds[8:10])}일 ({DAYS[datetime.strptime(ds, '%Y-%m-%d').weekday()]})",
        "overview": overview,
        "one_line": static.get("one_line", "") + " (자동 생성판: 토스 콘솔 수치는 제외)",
        "factlab": factlab,
        "reels": reels_sec,
        "threads": threads,
        "instagram": ig,
        "toss": {"facts": facts, "problems": static["toss"]["problems"]},
        "plan": static["plan"],
        "decisions": static["decisions"],
        "unknown": unknown,
    }
    out_dir = os.path.join(os.path.expanduser("~"), "OneDrive", "바탕 화면", "사주랩_보고서")
    os.makedirs(out_dir, exist_ok=True)
    pdf = os.path.join(out_dir, f"{ds}_일일보고서_자동.pdf")
    json.dump(data, open(os.path.join(HERE, f"data_{ds}_auto.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    R.build(data, pdf)
    print(pdf)
    try:
        sys.path.insert(0, os.path.join(SAJU, "scripts"))
        import notify
        notify.notify(f"일일 보고서 {ds}", f"유튜브 {len(uploads)}편 · 릴스 {len(reel_posts)}건 · {web_text}\n바탕 화면 > 07_사주랩_인수인계 > 일일보고서", tags=["page_facing_up"])
    except Exception:
        pass


if __name__ == "__main__":
    main()
