import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Analytics, Notification, Review, Share, TossAds, loadFullScreenAd, showFullScreenAd } from "@apps-in-toss/web-framework";
import { calculateSaju } from "@saju/engine";
import type { SajuInput, SajuResult } from "@saju/types";
import { generateFreeContent } from "@saju/content";
import { getTypeProfile } from "@saju/typeProfile";
import { ILGAN_PAGES } from "@saju/ilganPages";
import { getDailyFortuneDetail } from "@saju/dailyFortune";
import { currentYearKst, getGoodYears } from "@saju/goodYears";
import type { WuXing } from "@saju/ganzhi";

// 토스 미니앱용 사주랩(무료 버전). 사이트와 같은 계산·문구를 쓰고, 사이트로 내보내는 링크는 넣지 않는다
// (앱인토스 정책: 외부 링크·자사 서비스 이동 유도 금지, SSR 금지). 수익은 인앱 광고(배너)로 — 광고 그룹 ID는
// 콘솔에서 만든 뒤 VITE_AD_BANNER_RESULT에 넣는다. 결과 화면이 실제로 보일 때만 붙인다(로딩·팝업 위 광고 금지).

const STORAGE_KEY = "sajulab:lastInput";
const BANNER_AD_ID = import.meta.env.VITE_AD_BANNER_RESULT as string | undefined;
// 보상형 광고 그룹 ID와 "오늘의 운세 알림" 템플릿 코드는 콘솔에서 만든 뒤 빌드 때 넣는다. 없으면 해당 기능은 화면에 나오지 않는다.
const REWARD_AD_ID = import.meta.env.VITE_AD_REWARDED as string | undefined;
const PUSH_TEMPLATE = import.meta.env.VITE_PUSH_TEMPLATE as string | undefined;
const KEY_REWARD_DAY = "sajulab:rewardDay";
const KEY_PUSH = "sajulab:push";

/** 사용자 행동 기록(토스 콘솔 분석). 토스 밖이거나 미지원 버전이면 조용히 무시된다. */
function track(name: string, params: Record<string, string | number | boolean> = {}) {
  try {
    void Analytics.log({ log_name: name, log_type: "event", params }).catch(() => {});
  } catch {
    /* 기록 실패는 화면에 영향 없게 무시 */
  }
}

function todayKst(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

function readStore(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* 저장 실패해도 이번 화면에서는 그대로 쓴다 */
  }
}

function safeSupported(fn: { isSupported?: () => boolean }): boolean {
  try {
    return typeof fn.isSupported === "function" ? fn.isSupported() : false;
  } catch {
    return false;
  }
}
const WUXING_COLOR: Record<WuXing, string> = { 목: "#3fa66b", 화: "#e3543f", 토: "#c99a2e", 금: "#8a94a6", 수: "#3b6fd8" };
const WUXING_ORDER: WuXing[] = ["목", "화", "토", "금", "수"];
const YEARS = Array.from({ length: 2026 - 1930 + 1 }, (_, i) => 2026 - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const HOURS = Array.from({ length: 24 }, (_, i) => i);

type Form = { calendarType: "solar" | "lunar"; year: string; month: string; day: string; hour: string; unknownTime: boolean; gender: "" | "male" | "female" };
const EMPTY: Form = { calendarType: "solar", year: "", month: "", day: "", hour: "", unknownTime: false, gender: "" };

function loadSaved(): Form | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

/** 저장된 생일이 있으면 그 결과를 돌려준다(없거나 계산이 안 되면 null → 입력 화면부터). */
function savedResult(): { form: Form; result: SajuResult } | null {
  const form = loadSaved();
  if (!form || !form.year || !form.month || !form.day || !form.gender) return null;
  try {
    return { form, result: calculateSaju(toInput(form)) };
  } catch {
    return null;
  }
}

function toInput(f: Form): SajuInput {
  return {
    calendarType: f.calendarType,
    gender: f.gender as "male" | "female",
    year: Number(f.year),
    month: Number(f.month),
    day: Number(f.day),
    ...(f.unknownTime || f.hour === "" ? {} : { hour: Number(f.hour), minute: 0 }),
  };
}

type Screen = "today" | "form" | "result";

export default function App() {
  // 다시 온 사람(저장된 생일이 있음)은 입력 화면 대신 "오늘의 운세"부터 보여준다 — 매일 열 이유가 첫 화면에서 보여야 재방문이 생긴다.
  const [saved] = useState(() => savedResult());
  const demo = import.meta.env.DEV ? new URLSearchParams(location.search).get("demo") : null;
  const initialScreen: Screen = demo === "1" ? "result" : demo === "form" ? "form" : saved ? "today" : "form";
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [form, setForm] = useState<Form>(() => {
    if (import.meta.env.DEV && new URLSearchParams(location.search).get("demo") === "form") {
      return { calendarType: "solar", year: "1995", month: "7", day: "12", hour: "14", unknownTime: false, gender: "female" };
    }
    return loadSaved() ?? EMPTY;
  });
  // 개발 화면 전용: ?demo=1 이면 예시 생일로 결과 화면을 바로 띄운다(콘솔 스크린샷 캡처용, 배포 번들엔 영향 없음).
  const [result, setResult] = useState<SajuResult | null>(() => {
    if (import.meta.env.DEV && new URLSearchParams(location.search).get("demo") === "1") {
      return calculateSaju({ calendarType: "solar", gender: "female", year: 1995, month: 7, day: 12, hour: 14, minute: 0 });
    }
    return saved?.result ?? null;
  });
  const [error, setError] = useState<string | null>(null);

  // 토스 내비게이션 바의 뒤로가기 = 브라우저 뒤로가기. 화면을 열 때마다 기록을 쌓고, 뒤로 가면 그 이전 화면으로 돌아간다. 첫 화면에서 누르면 미니앱 종료.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => setScreen((e.state?.screen as Screen | undefined) ?? initialScreen);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [initialScreen]);

  function go(next: Screen) {
    window.history.pushState({ screen: next }, "");
    window.scrollTo(0, 0);
    setScreen(next);
  }

  const daysInMonth = form.year && form.month ? new Date(Number(form.year), Number(form.month), 0).getDate() : 31;
  const ready = form.year && form.month && form.day && form.gender && (form.unknownTime || form.hour !== "");

  function submit() {
    setError(null);
    try {
      const r = calculateSaju(toInput(form));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
      } catch {
        /* 저장 실패해도 결과는 보여준다 */
      }
      setResult(r);
      track("form_submit");
      go("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "입력값을 확인해 주세요.");
    }
  }

  if (screen === "result" && result) return <ResultScreen result={result} onOther={() => go("form")} />;
  if (screen === "today" && result) return <TodayScreen result={result} onFull={() => go("result")} onOther={() => go("form")} />;

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  return (
    <main className="page">
      <header className="hero">
        <div className="eyebrow">SAJU LAB</div>
        <h1>
          생일만 넣으면 30초,
          <br />내 사주 타입
        </h1>
        <p>태어난 날로 보는 나의 일간 유형·오행·오늘의 운세</p>
      </header>

      <section className="card">
        <div className="field">
          <span>양력 / 음력</span>
          <div className="row">
            {(["solar", "lunar"] as const).map((c) => (
              <button key={c} type="button" className={`toggle ${form.calendarType === c ? "on" : ""}`} onClick={() => set({ calendarType: c })}>
                {c === "solar" ? "양력" : "음력"}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span>생년월일</span>
          <div className="row">
            <select value={form.year} onChange={(e) => set({ year: e.target.value })}>
              <option value="">년</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}년</option>
              ))}
            </select>
            <select value={form.month} onChange={(e) => set({ month: e.target.value })}>
              <option value="">월</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>{m}월</option>
              ))}
            </select>
            <select value={form.day} onChange={(e) => set({ day: e.target.value })}>
              <option value="">일</option>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}일</option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <span>태어난 시간</span>
          <select value={form.hour} disabled={form.unknownTime} onChange={(e) => set({ hour: e.target.value })}>
            <option value="">시간 선택</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>{String(h).padStart(2, "0")}시</option>
            ))}
          </select>
          <label className="check">
            <input type="checkbox" checked={form.unknownTime} onChange={(e) => set({ unknownTime: e.target.checked, hour: "" })} />
            시간을 몰라요 (일간 유형은 그대로 나와요)
          </label>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <span>성별</span>
          <div className="row">
            {(["female", "male"] as const).map((g) => (
              <button key={g} type="button" className={`toggle ${form.gender === g ? "on" : ""}`} onClick={() => set({ gender: g })}>
                {g === "female" ? "여성" : "남성"}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && <p className="muted" style={{ textAlign: "center", color: "#e3543f" }}>{error}</p>}
      <button type="button" className="cta" disabled={!ready} onClick={submit}>
        내 사주 타입 보기
      </button>
      <p className="foot">입력한 생년월일은 이 기기에만 저장돼요.</p>
    </main>
  );
}

/** 다시 온 사람이 처음 보는 화면: 오늘의 운세 + 내 사주 타입 요약. 입력 없이 바로 보이게 한다. */
function TodayScreen({ result, onFull, onOther }: { result: SajuResult; onFull: () => void; onOther: () => void }) {
  const free = useMemo(() => generateFreeContent(result), [result]);
  const type = useMemo(() => getTypeProfile(result.dayPillar.ganKor), [result]);
  const daily = useMemo(() => getDailyFortuneDetail(result), [result]);
  useEffect(() => track("screen_today"), []);
  return (
    <main className="page">
      <header className="hero">
        <div className="eyebrow">SAJU LAB</div>
        <h1>오늘의 운세</h1>
        <p>{daily.dateLabel} · {type.typeName} ({free.dayMasterLabel})</p>
      </header>

      <section className="card">
        <h2>오늘의 한 줄</h2>
        <p>{daily.oneLiner}</p>
        <div className="fortune-grid">
          <div><b>연애</b>{daily.love}</div>
          <div><b>재물</b>{daily.wealth}</div>
          <div><b>일</b>{daily.career}</div>
          <div><b>관계</b>{daily.relationship}</div>
        </div>
        <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>내일 다시 오면 새 운세가 나와요</p>
      </section>

      <section className="card">
        <h2>오늘의 종합 풀이</h2>
        <p>{daily.overall}</p>
        <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>
          행운의 숫자 {daily.luckyNumber} · 행운의 색 {daily.luckyColor}
        </p>
      </section>
      <PushCard />

      <BannerAd />

      <button type="button" className="cta" onClick={onFull}>내 사주 타입 전체 보기</button>
      <button type="button" className="ghost" onClick={onOther}>다른 생일로 보기</button>
      <ReviewLink />
      <p className="foot">전통 명리학 해석을 쉽게 풀어 쓴 참고용 콘텐츠예요.</p>
    </main>
  );
}

/** 보상형 광고를 끝까지 보면 가려 둔 풀이(children)를 오늘 하루 열어 준다. 미지원 환경(옛 토스 버전·광고 ID 없음)이면 광고 없이 바로 보여 준다. */
function AdGate({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  const gated = import.meta.env.DEV || (!!REWARD_AD_ID && safeSupported(loadFullScreenAd) && safeSupported(showFullScreenAd));
  const [unlocked, setUnlocked] = useState(() => !gated || readStore(KEY_REWARD_DAY) === todayKst());
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  // 개발 화면(또는 광고 ID 없음)에서는 광고 없이 바로 눌러 볼 수 있다.
  const ready = import.meta.env.DEV || !REWARD_AD_ID ? true : loaded;

  useEffect(() => {
    if (!gated || unlocked || import.meta.env.DEV || !REWARD_AD_ID) return;
    // 배너 광고 로드가 끝난 뒤 순서대로 불러온다(광고 그룹을 동시에 로드하면 일부 안드로이드 버전에서 이벤트가 누락됨).
    let unregister: (() => void) | undefined;
    const timer = window.setTimeout(() => {
      try {
        unregister = loadFullScreenAd({
          options: { adGroupId: REWARD_AD_ID },
          onEvent: (e) => {
            if (e.type === "loaded") setLoaded(true);
          },
          onError: () => setFailed(true),
        });
      } catch {
        setFailed(true);
      }
    }, 2500);
    return () => {
      window.clearTimeout(timer);
      unregister?.();
    };
  }, [gated, unlocked]);

  function unlock() {
    writeStore(KEY_REWARD_DAY, todayKst());
    setUnlocked(true);
    track("reward_earned");
  }

  function watch() {
    track("reward_click");
    if (import.meta.env.DEV || !REWARD_AD_ID) {
      unlock();
      return;
    }
    try {
      showFullScreenAd({
        options: { adGroupId: REWARD_AD_ID },
        onEvent: (e) => {
          // 광고를 끝까지 봤을 때만 지급한다(닫기만 해서는 지급하지 않음).
          if (e.type === "userEarnedReward") unlock();
          if (e.type === "failedToShow") setFailed(true);
        },
        onError: () => setFailed(true),
      });
    } catch {
      setFailed(true);
    }
  }

  if (unlocked) return <>{children}</>;
  return (
    <section className="card reward">
      <h2>{title}</h2>
      <p className="muted" style={{ fontSize: 14 }}>{hint}</p>
      <button type="button" className="cta" style={{ marginTop: 12 }} disabled={!ready || failed} onClick={watch}>
        {failed ? "지금은 광고를 불러올 수 없어요" : ready ? "광고 보고 열어보기" : "광고 불러오는 중..."}
      </button>
    </section>
  );
}

/** 사용자가 직접 신청한 "매일 오늘의 운세 도착" 알림(기능성 메시지). 템플릿 코드가 없거나 미지원이면 숨긴다. */
function PushCard() {
  const available = !!PUSH_TEMPLATE && safeSupported(Notification.requestAgreement);
  const [state, setState] = useState<"idle" | "on" | "rejected">(() => (readStore(KEY_PUSH) === "on" ? "on" : "idle"));
  if (!available) return null;

  function request() {
    track("push_click");
    let cleanup: (() => void) | undefined;
    try {
      cleanup = Notification.requestAgreement({
        options: { templateCode: PUSH_TEMPLATE as string },
        onEvent: (r) => {
          if (r.type === "newAgreement" || r.type === "alreadyAgreed") {
            writeStore(KEY_PUSH, "on");
            setState("on");
          } else {
            setState("rejected");
          }
          track("push_result", { result: r.type });
          cleanup?.();
        },
        onError: () => cleanup?.(),
      });
    } catch {
      /* 미지원 버전이면 아무 일도 일어나지 않는다 */
    }
  }

  return (
    <section className="card">
      <h2>매일 아침 운세 알림</h2>
      {state === "on" ? (
        <p className="muted" style={{ fontSize: 14 }}>알림을 신청했어요. 토스 앱 설정에서 언제든 끌 수 있어요.</p>
      ) : (
        <>
          <p className="muted" style={{ fontSize: 14 }}>
            {state === "rejected" ? "알림을 받지 않기로 했어요. 마음이 바뀌면 다시 신청할 수 있어요." : "신청하면 매일 아침 오늘의 운세가 도착했다고 알려드려요."}
          </p>
          <button type="button" className="ghost" style={{ marginTop: 12 }} onClick={request}>알림 받기</button>
        </>
      )}
    </section>
  );
}

/** 사용자가 직접 누르는 평가 요청(자동으로 띄우지 않는다). */
function ReviewLink() {
  if (!import.meta.env.DEV && !safeSupported(Review.request)) return null;
  async function ask() {
    track("review_click");
    try {
      await Review.request();
    } catch {
      /* 미지원 버전이면 무시 */
    }
  }
  return (
    <button type="button" className="link" onClick={() => void ask()}>
      앱이 마음에 들었다면 평가 남기기
    </button>
  );
}

function ResultScreen({ result, onOther }: { result: SajuResult; onOther: () => void }) {
  const free = useMemo(() => generateFreeContent(result), [result]);
  const type = useMemo(() => getTypeProfile(result.dayPillar.ganKor), [result]);
  const page = useMemo(() => ILGAN_PAGES.find((p) => p.gan === result.dayPillar.ganKor)!, [result]);
  const daily = useMemo(() => getDailyFortuneDetail(result), [result]);
  const goodYears = useMemo(() => getGoodYears(result, currentYearKst(), 5, 2), [result]);
  const pillars = [
    { label: "시주", p: result.timePillar },
    { label: "일주", p: result.dayPillar },
    { label: "월주", p: result.monthPillar },
    { label: "년주", p: result.yearPillar },
  ];

  useEffect(() => track("screen_result"), []);

  async function shareResult() {
    track("share_click");
    try {
      const link = await Share.createLink({ path: "intoss://sajulab-app" });
      await Share.sendMessage({ message: `나는 ${type.typeName}(${free.dayMasterLabel})래 🔮 너는 무슨 타입이야? 생일만 넣으면 30초!\n${link}` });
    } catch {
      /* 토스 밖(개발 화면)에서는 공유 시트가 없다 */
    }
  }

  return (
    <main className="page">
      <section className="card type-card">
        <div className="eyebrow">나의 사주 타입</div>
        <div className="type-name">{type.typeName}</div>
        <div className="type-sub">{free.dayMasterLabel} · {free.dayMasterMetaphor}</div>
        <div className="chips">
          {page.keywords.map((k) => (
            <span key={k} className="chip">#{k}</span>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>타고난 성격</h2>
        <p>{free.personality}</p>
      </section>

      <section className="card">
        <h2>나의 여덟 글자</h2>
        <div className="pillars">
          {pillars.map(({ label, p }) => (
            <div key={label} className="pillar">
              <small>{label}</small>
              <b>{p ? p.ganZhiHanja : "?"}</b>
              <small style={{ marginTop: 4 }}>{p ? p.ganZhiKor : "시간 모름"}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>오행 비율</h2>
        {WUXING_ORDER.map((w) => (
          <div key={w} className="bar">
            <span style={{ color: WUXING_COLOR[w] }}>{w}</span>
            <div className="track">
              <div className="fill" style={{ width: `${result.wuxingPercent[w]}%`, background: WUXING_COLOR[w] }} />
            </div>
            <span>{result.wuxingPercent[w]}%</span>
          </div>
        ))}
        <p className="muted" style={{ marginTop: 10, fontSize: 14 }}>{free.balanceNote}</p>
      </section>

      <BannerAd />

      <section className="card">
        <h2>오늘의 운세 · {daily.dateLabel}</h2>
        <p>{daily.oneLiner}</p>
        <div className="fortune-grid">
          <div><b>연애</b>{daily.love}</div>
          <div><b>재물</b>{daily.wealth}</div>
          <div><b>일</b>{daily.career}</div>
          <div><b>관계</b>{daily.relationship}</div>
        </div>
        <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>
          행운의 숫자 {daily.luckyNumber} · 행운의 색 {daily.luckyColor} · 내일 다시 오면 새 운세가 나와요
        </p>
      </section>

      <section className="card">
        <h2>{page.hangul} 일간의 강점</h2>
        <ul className="list">
          {page.strengths.map((s) => (
            <li key={s.title}><b>{s.title}</b> — {s.body}</li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>이런 점은 조심하면 좋아요</h2>
        <ul className="list">
          {page.cautions.map((c) => (
            <li key={c.title}><b>{c.title}</b> — {c.body}</li>
          ))}
        </ul>
      </section>

      <AdGate
        title="앞으로 좋은 흐름이 오는 해 · 연애 · 일과 돈"
        hint="광고를 끝까지 보면 앞으로 흐름이 좋은 해와 연애 스타일, 일·돈 풀이, 잘 맞는 기운이 열려요."
      >
      {goodYears.length > 0 && (
        <section className="card">
          <h2>앞으로 흐름이 좋은 해</h2>
          <ul className="list">
            {goodYears.map((g) => (
              <li key={g.year}><b>{g.year}년 {g.ganzhiKor} · {g.label}</b> — {g.line}</li>
            ))}
          </ul>
        </section>
      )}
      <section className="card">
        <h2>연애 스타일</h2>
        <p>{page.love}</p>
      </section>
      <section className="card">
        <h2>일과 돈</h2>
        <p>{page.work}</p>
        <p style={{ marginTop: 10 }}>{page.money}</p>
      </section>
      <section className="card">
        <h2>잘 맞는 기운 · 긴장되는 기운</h2>
        <p>{type.synergyNote}</p>
        <p style={{ marginTop: 10 }}>{type.tensionNote}</p>
      </section>

      </AdGate>

      <button type="button" className="cta" onClick={() => void shareResult()}>친구는 무슨 타입일까? 공유하기</button>
      <button type="button" className="ghost" onClick={onOther}>다른 생일로 다시 보기</button>
      <ReviewLink />
      <p className="foot">전통 명리학 해석을 쉽게 풀어 쓴 참고용 콘텐츠예요. 같은 일간이라도 사주 전체 구성에 따라 해석은 달라질 수 있어요.</p>
    </main>
  );
}

/** 결과 화면 중간의 배너 광고. 광고 그룹 ID가 없거나 토스 밖이면 아무것도 그리지 않는다. */
function BannerAd() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!BANNER_AD_ID || !ref.current) return;
    let destroy: (() => void) | undefined;
    try {
      if (!TossAds.initialize.isSupported()) return;
      TossAds.initialize({
        callbacks: {
          onInitialized: () => {
            if (ref.current) destroy = TossAds.attachBanner(BANNER_AD_ID, ref.current, { theme: "light", variant: "card" }).destroy;
          },
        },
      });
    } catch {
      /* 광고 실패는 화면에 영향 없게 무시 */
    }
    return () => destroy?.();
  }, []);
  return <div ref={ref} className="ad-slot" />;
}
