"""인스타그램 참여형 게시물(2026-10-23~, 인스타 유입 진단 '고칠 것 A').

Threads에서 글당 300~800회·답글 18~66을 받은 "생일 남기면 풀어드림" 형식을 인스타 카드(2장)로 매일 1개 올린다.
1장: 질문·약속(큰 글씨) / 2장: 실제 계산한 예시 풀이 + 댓글 남기는 법. 댓글은 ig_replies.py가 풀이 답글을 단다.

  python scripts/ig_reading_post.py            # 오늘 게시(하루 1번, 같은 변형은 7일 안에 다시 안 씀)
  python scripts/ig_reading_post.py --render   # 이미지만 만들어 보기(게시 안 함)

작업 스케줄러: SajuIgReading 매일 19:00. 기록: scripts/posted_state/ig_reading/<id>-YYYYMMDD.json(git, promise 포함).
판정(10/30): 게시물당 댓글 5개↑·조회 300회↑·팔로워 +20 — 미달이면 원인 분석 → 수정 → 재실행.
"""
import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timezone, timedelta

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import git_sync  # noqa: E402
import notify  # noqa: E402
import publish_carousel  # noqa: E402
import threads_replies as tr  # noqa: E402

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VARIANTS = os.path.join(BASE_DIR, "scripts", "ig_reading_posts.json")
POSTED_DIR = os.path.join(BASE_DIR, "scripts", "posted_state", "ig_reading")
RENDER_ROOT = os.environ.get("SAJU_RENDER_DIR", os.path.join(os.path.expanduser("~"), "SajuAutoRender"))
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
KST = timezone(timedelta(hours=9))
REPEAT_DAYS = 7
LOW_POOL = 2  # 7일 안에 안 쓴 변형이 이 개수 이하로 줄면 미리 알린다(변형이 8개 미만이면 매주 빈 날이 생긴다)
EXAMPLE = {"date": "1985-03-14", "label": "1985년 3월 14일생"}  # 2장 예시(실제 계산값을 보여준다)
HASHTAGS = "#2027운세 #신년운세 #사주 #무료사주 #운세 #사주풀이"


def records():
    out = []
    if os.path.isdir(POSTED_DIR):
        for n in os.listdir(POSTED_DIR):
            if n.endswith(".json"):
                with open(os.path.join(POSTED_DIR, n), "r", encoding="utf-8") as f:
                    out.append(json.load(f))
    return out


def pool(now):
    """(오늘 이미 올렸는지, 7일 안에 안 쓴 변형 목록 — 순서대로)."""
    recs = records()
    done_today = any(datetime.fromisoformat(r["posted_at"]).astimezone(KST).date() == now.date() for r in recs)
    recent = {r["id"] for r in recs if (now - datetime.fromisoformat(r["posted_at"])).days < REPEAT_DAYS}
    with open(VARIANTS, "r", encoding="utf-8") as f:
        variants = json.load(f)
    start = len(recs) % len(variants)
    ordered = variants[start:] + variants[:start]
    return done_today, [v for v in ordered if v["id"] not in recent]


def pick(now):
    done_today, candidates = pool(now)
    if done_today or not candidates:
        return None
    return candidates[0]


def example_lines(promise):
    """예시 생일의 실제 계산값으로 2장 문구를 만든다(지어내지 않는다)."""
    p = tr.compute_ilgan([{"key": "ex", "date": EXAMPLE["date"], "lunar": False, "gender": "여"}])[0]
    pick_t = tr.pick_timing(p, promise)
    ilgan = f"{p.get('hangul')} 일간"
    lines = [EXAMPLE["label"], ilgan]
    if pick_t and pick_t.get("years"):
        # 예시는 내년부터 — 이미 지나가는 올해를 예로 들면 기대감이 약하다.
        pick_t = {**pick_t, "years": [y for y in pick_t["years"] if y["year"] > datetime.now(KST).year] or pick_t["years"]}
        pick_t["months"] = [m for m in pick_t.get("months", []) if not m.startswith(str(datetime.now(KST).year))] or pick_t.get("months", [])
        y = pick_t["years"][0]
        gz = tr_ganzhi_kor(y.get("ganzhi", ""))
        if y.get("기운"):  # 내년 운세·좋은 해: 그 해의 이름
            lines.append(f"{y['year']}년 {gz}년은 {y['기운'].split('(')[0]}로 봐요")
        else:  # 돈·일·인연 시기: 그 기운이 들어오는 해
            lines.append(f"{y['year']}년 {gz}년에 {(pick_t.get('기운') or '').split('(')[0]}이 들어오는 흐름이에요")
        if len(pick_t["years"]) > 1:
            y2 = pick_t["years"][1]
            lines.append(f"그다음은 {y2['year']}년" + (f" · {y2['기운'].split('(')[0]}" if y2.get("기운") else "에도 이어져요"))
    if pick_t and pick_t.get("months"):
        m = pick_t["months"][0]
        lines.append(f"특히 {m} 흐름이 좋아요" if "2027" in promise or "운세" in promise else f"가깝게는 {m}에도 기운이 보여요")
    if len(lines) == 2:
        lines.append((p.get("summary") or "")[:40])
    return lines


HANJA_KOR = dict(zip("甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥", "갑을병정무기경신임계자축인묘진사오미신유술해"))


def tr_ganzhi_kor(gz):
    return "".join(HANJA_KOR.get(ch, ch) for ch in gz)


SLIDE_CSS = """
html,body{margin:0;width:1080px;height:1350px}
body{font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif;background:linear-gradient(165deg,#fffaf0 0%,#fde9c2 100%);display:flex;align-items:center;justify-content:center;color:#191f28}
.c{width:940px;height:1210px;border-radius:56px;background:#fff;box-shadow:0 18px 50px rgba(150,110,30,.16);border:5px solid #f1dfb8;display:flex;flex-direction:column;justify-content:center;padding:0 80px;box-sizing:border-box;gap:30px;word-break:keep-all}
.brand{font-size:36px;font-weight:700;color:#b8892b;letter-spacing:.06em}
.head{font-size:92px;font-weight:900;line-height:1.25}
.sub{font-size:58px;font-weight:800;color:#7b5cd6;line-height:1.35}
.how{font-size:42px;color:#4e5968;line-height:1.5;margin-top:20px}
.ex{font-size:40px;color:#8b95a1;font-weight:700}
.line{font-size:56px;font-weight:800;line-height:1.4}
.line.k{color:#b0701a}
.box{background:#f9f4ea;border-radius:32px;padding:44px 50px;display:flex;flex-direction:column;gap:18px}
"""


def render(v, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    for f in os.listdir(out_dir):
        if f.endswith(".png"):
            os.remove(os.path.join(out_dir, f))
    ex = example_lines(v["promise"])
    s1 = f"""<div class='c'><div class='brand'>사주랩</div><div class='head'>{v['head']}</div><div class='sub'>{v['sub']} {v['emoji']}</div>
<div class='how'>예) 1985.3.14 양력<br>태어난 시간은 몰라도 괜찮아요</div></div>"""
    lines = "".join(f"<div class='line{' k' if i == 2 else ''}'>{t}</div>" for i, t in enumerate(ex[1:]))
    s2 = f"""<div class='c'><div class='ex'>이렇게 풀어드려요 · 예시 {ex[0]}</div><div class='box'>{lines}</div>
<div class='how'>👇 댓글에 생년월일(양력/음력)만 남겨주세요.<br>하나씩 답글로 풀어드려요.</div></div>"""
    paths = []
    for i, body in enumerate((s1, s2), 1):
        html_path = os.path.join(out_dir, f"s{i}.html")
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(f"<!doctype html><html><head><meta charset='utf-8'><style>{SLIDE_CSS}</style></head><body>{body}</body></html>")
        png = os.path.join(out_dir, f"{i:02d}.png")
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1080,1350",
                        f"--screenshot={png}", "file:///" + html_path.replace("\\", "/")], capture_output=True, timeout=60)
        paths.append(png)
    return paths


def caption(v):
    return (f"{v['head']} → {v['sub']} {v['emoji']}\n\n"
            "👇 댓글에 생년월일(양력/음력)만 남겨주세요. 하나씩 답글로 풀어드려요.\n"
            "(태어난 시간은 몰라도 괜찮아요)\n\n"
            "※ 전통 사주 해석을 바탕으로 한 재미용 풀이예요\n\n" + HASHTAGS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--render", action="store_true", help="이미지만 만들기")
    args = ap.parse_args()
    now = datetime.now(KST)
    git_sync.git_pull(BASE_DIR)
    if args.render:
        with open(VARIANTS, "r", encoding="utf-8") as f:
            v = json.load(f)[0]
        print(render(v, os.path.join(RENDER_ROOT, "ig_reading", "preview")))
        return
    if now.hour < 10:
        print("10시 전 밀린 실행이라 건너뜀")
        return
    done_today, candidates = pool(now)
    if done_today:
        print("오늘 이미 올림")
        return
    if not candidates:
        notify.notify("❌ 인스타 참여형 글 소진", f"오늘 올릴 새 글이 없어 건너뜀 — scripts/ig_reading_posts.json에 변형을 추가해야 해요 "
                      f"(같은 글은 {REPEAT_DAYS}일 안에 다시 안 씀)", priority=5, tags=["rotating_light"])
        print("쓸 변형이 없음")
        return
    v = candidates[0]
    if len(candidates) - 1 <= LOW_POOL:
        notify.notify("⚠️ 인스타 참여형 글 소진 임박", f"오늘 글을 올리면 {REPEAT_DAYS}일 안에 안 쓴 글이 {len(candidates) - 1}개 남아요 — "
                      "ig_reading_posts.json에 변형 추가 필요", priority=4, tags=["warning"])
    rec_id = f"{v['id']}-{now:%Y%m%d}"
    lock_rel = os.path.relpath(os.path.join(POSTED_DIR, f"{rec_id}.lock"), BASE_DIR)
    ok, holder = git_sync.try_acquire_lock(BASE_DIR, lock_rel)
    if not ok:
        print(f"다른 컴퓨터({holder})가 처리 중")
        return
    try:
        git_sync.git_pull(BASE_DIR)
        if pick(now) is None:
            return
        out_dir = os.path.join(RENDER_ROOT, "ig_reading", rec_id)
        render(v, out_dir)
        media_id = publish_carousel.publish(out_dir, caption(v), f"saju_igreading_{rec_id}")
        os.makedirs(POSTED_DIR, exist_ok=True)
        path = os.path.join(POSTED_DIR, f"{rec_id}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump({"id": v["id"], "media_id": str(media_id), "promise": v["promise"], "posted_at": datetime.now(timezone.utc).isoformat(),
                       "head": v["head"]}, f, ensure_ascii=False, indent=2)
        git_sync.git_commit_push(BASE_DIR, [os.path.relpath(path, BASE_DIR)], f"posted: instagram reading {rec_id}")
        notify.notify("✅ 인스타 참여형 게시", f"{v['head']} — 댓글은 자동 답글", tags=["white_check_mark"])
        print(f"게시 완료 {media_id}")
    except Exception as e:
        notify.notify("❌ 인스타 참여형 게시 실패", notify.summarize_error(str(e)), priority=5, tags=["rotating_light"])
        raise
    finally:
        git_sync.release_lock(BASE_DIR, lock_rel)


if __name__ == "__main__":
    main()
