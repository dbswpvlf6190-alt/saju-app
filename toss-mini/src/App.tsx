import { useEffect, useMemo, useRef, useState } from "react";
import { Analytics, Notification, Review, Share, TossAds, getOperationalEnvironment, getSchemeUri, getTossAppVersion, loadFullScreenAd, showFullScreenAd } from "@apps-in-toss/web-framework";
import { calculateSaju } from "@saju/engine";
import type { SajuInput, SajuResult } from "@saju/types";
import { generateFreeContent } from "@saju/content";
import { getTypeProfile } from "@saju/typeProfile";
import { ILGAN_PAGES } from "@saju/ilganPages";
import { getDailyFortuneDetail } from "@saju/dailyFortune";
import { currentYearKst, getGoodYears } from "@saju/goodYears";
import type { WuXing } from "@saju/ganzhi";
import { CHAPTER_PROMISES, CHAPTER_TITLES, buyManual, buyProduct, iapAvailable, loadManual, recoverPendingOrders, savedPurchaseFor, type Purchase } from "./iap";
import { NewYearMini, NewYearTeaser } from "./v11/NewYearTeaser";
import { NewYearScreen } from "./v11/NewYearScreen";
import { NY_YEAR, getVariant, nyTrack } from "./v11/ny";

// 토스 미니앱용 사주랩(무료 버전). 사이트와 같은 계산·문구를 쓰고, 사이트로 내보내는 링크는 넣지 않는다
// (앱인토스 정책: 외부 링크·자사 서비스 이동 유도 금지, SSR 금지). 수익은 인앱 광고(배너)로 — 광고 그룹 ID는
// 콘솔에서 만든 뒤 VITE_AD_BANNER_RESULT에 넣는다. 결과 화면이 실제로 보일 때만 붙인다(로딩·팝업 위 광고 금지).

const STORAGE_KEY = "sajulab:lastInput";
const BANNER_AD_ID = import.meta.env.VITE_AD_BANNER_RESULT as string | undefined;
// 보상형 광고 그룹 ID와 "오늘의 운세 알림" 템플릿 코드는 콘솔에서 만든 뒤 빌드 때 넣는다. 없으면 해당 기능은 화면에 나오지 않는다.
const REWARD_AD_ID = import.meta.env.VITE_AD_REWARDED as string | undefined;
const PUSH_TEMPLATE = import.meta.env.VITE_PUSH_TEMPLATE as string | undefined;
const KEY_REWARD_DAY = "sajulab:rewardDay:v3c";
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
const EMPTY: Form = { calendarType: "solar", year: "", month: "", day: "", hour: "", unknownTime: true, gender: "" };

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

type Screen = "today" | "form" | "result" | "manual" | "newyear";

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
  const gate = useRewardGate();
  const formStarted = useRef(false);
  // 구매 기록은 생일별로 저장돼 있어, 지금 입력한 생일의 구매만 "열기"로 보인다(다른 생일은 새로 구매할 수 있다).
  const [purchaseTick, setPurchaseTick] = useState(0);
  const purchase = useMemo<Purchase | null>(() => {
    try {
      return savedPurchaseFor(toInput(form));
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, purchaseTick]);
  // v11 신년운세 구매 기록(생일별, 사용설명서와 따로 저장).
  const nyPurchase = useMemo<Purchase | null>(() => {
    try {
      return savedPurchaseFor(toInput(form), "newYear");
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, purchaseTick]);

  // 결제는 됐지만 지급이 끝나지 않은 주문이 있으면 앱을 열 때 이어서 지급한다(앱 종료·네트워크 오류 대비).
  useEffect(() => {
    const f = loadSaved();
    if ((!iapAvailable() && !iapAvailable("newYear")) || !f || !f.year || !f.month || !f.day || !f.gender) return;
    let alive = true;
    void recoverPendingOrders(toInput(f)).then((p) => {
      if (alive && p) setPurchaseTick((n) => n + 1);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 토스 내비게이션 바의 뒤로가기 = 브라우저 뒤로가기. 화면을 열 때마다 기록을 쌓고, 뒤로 가면 그 이전 화면으로 돌아간다. 첫 화면에서 누르면 미니앱 종료.
  useEffect(() => {
    const onPop = (e: PopStateEvent) => setScreen((e.state?.screen as Screen | undefined) ?? initialScreen);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [initialScreen]);

  /** 태어난 시간을 나중에 넣으면 같은 폰 안에서 바로 다시 계산한다(서버 불필요). 시주가 들어가 결과가 더 정확해진다. */
  function addHour(hour: string) {
    if (hour === "") return;
    const next: Form = { ...form, hour, unknownTime: false };
    try {
      const r = calculateSaju(toInput(next));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setForm(next);
      setResult(r);
      track("hour_added");
    } catch {
      /* 계산이 안 되면 그대로 둔다 */
    }
  }

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
      gate.run(() => go("result"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "입력값을 확인해 주세요.");
    }
  }

  if (screen === "manual" && purchase) return <ManualScreen purchase={purchase} onBack={() => window.history.back()} />;
  if (screen === "newyear" && nyPurchase && result) return <NewYearScreen purchase={nyPurchase} result={result} onBack={() => window.history.back()} />;
  if (screen === "result" && result)
    return (
      <ResultScreen
        result={result}
        form={form}
        purchase={purchase}
        onPurchased={() => {
          setPurchaseTick((n) => n + 1);
          go("manual");
        }}
        onOpenManual={() => go("manual")}
        nyPurchase={nyPurchase}
        onNyPurchased={() => {
          setPurchaseTick((n) => n + 1);
          go("newyear");
        }}
        onOpenNy={() => go("newyear")}
        onAddHour={addHour}
        onOther={() => go("form")}
      />
    );
  if (screen === "today" && result) return <TodayScreen result={result} onFull={() => gate.run(() => go("result"))} fullLabel={gate.label("내 사주 타입 전체 보기")} fullDisabled={gate.disabled} diag={gate.diag} nyPurchased={!!nyPurchase} onOther={() => go("form")} />;

  const set = (patch: Partial<Form>) => {
    if (!formStarted.current) {
      formStarted.current = true;
      track("form_start");
    }
    setForm((f) => ({ ...f, ...patch }));
  };
  return (
    <main className="page">
      <header className="hero">
        <div className="eyebrow">SAJU LAB</div>
        <h1>
          생일만 넣으면 30초,
          <br />내 사주 타입
        </h1>
        <p>태어난 날로 보는 나의 일간 유형·오행·오늘의 운세{iapAvailable("newYear") ? `·${NY_YEAR}년 좋은 달` : ""}</p>
      </header>

      <SampleCard />

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
          <span>태어난 시간 (선택)</span>
          <select value={form.hour} disabled={form.unknownTime} onChange={(e) => set({ hour: e.target.value })}>
            <option value="">시간 선택</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>{String(h).padStart(2, "0")}시</option>
            ))}
          </select>
          <label className="check">
            <input type="checkbox" checked={form.unknownTime} onChange={(e) => set({ unknownTime: e.target.checked, hour: "" })} />
            시간을 몰라요 (결과 화면에서 나중에 넣을 수 있어요)
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
      <button type="button" className="cta" disabled={!ready || gate.disabled} onClick={submit}>
        {gate.label("내 사주 타입 보기")}
      </button>
      {gate.diag && <p className="muted" style={{ textAlign: "center", fontSize: 11, wordBreak: "break-all" }}>{gate.diag}</p>}
      {gate.needsAd && <p className="muted" style={{ textAlign: "center", fontSize: 13 }}>광고를 끝까지 보면 내 사주를 무료로 볼 수 있어요. 오늘 한 번만 보면 돼요.</p>}
      <p className="foot">입력한 생년월일은 이 기기에만 저장돼요.</p>
    </main>
  );
}

/** 다시 온 사람이 처음 보는 화면: 오늘의 운세 + 내 사주 타입 요약. 입력 없이 바로 보이게 한다. */
function TodayScreen({ result, onFull, fullLabel, fullDisabled, diag, nyPurchased, onOther }: { result: SajuResult; onFull: () => void; fullLabel: string; fullDisabled: boolean; diag: string; nyPurchased: boolean; onOther: () => void }) {
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
      {iapAvailable("newYear") && <NewYearMini result={result} purchased={nyPurchased} onGo={() => { nyTrack("ny_mini_click"); onFull(); }} />}
      <PushCard />

      <BannerAd />

      <button type="button" className="cta" disabled={fullDisabled} onClick={onFull}>{fullLabel}</button>
      {diag && <p className="muted" style={{ textAlign: "center", fontSize: 11, wordBreak: "break-all" }}>{diag}</p>}
      <button type="button" className="ghost" onClick={onOther}>다른 생일로 보기</button>
      <ReviewLink />
      <p className="foot">전통 명리학 해석을 쉽게 풀어 쓴 참고용 콘텐츠예요.</p>
    </main>
  );
}

/**
 * "광고 보고 내 사주 공짜로 보기": 보상형 광고를 끝까지 보면 결과 화면으로 넘어간다. 하루 한 번만 보면 그날은 다시 묻지 않는다.
 * 광고 미지원(옛 토스 버전·ID 없음)·로드 실패·표시 실패면 광고 없이 바로 결과를 보여 줘서 사용자를 막지 않는다.
 */
function useRewardGate() {
  const gated = import.meta.env.DEV || !!REWARD_AD_ID;
  const [unlocked, setUnlocked] = useState(() => !gated || readStore(KEY_REWARD_DAY) === todayKst());
  const [err, setErr] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "failed">(import.meta.env.DEV ? "ready" : "loading");

  useEffect(() => {
    if (!gated || unlocked || import.meta.env.DEV || !REWARD_AD_ID) return;
    // 배너 광고 로드가 끝난 뒤 순서대로 불러온다(광고 그룹을 동시에 로드하면 일부 안드로이드 버전에서 이벤트가 누락됨).
    let unregister: (() => void) | undefined;
    const timer = window.setTimeout(() => {
      try {
        unregister = loadFullScreenAd({
          options: { adGroupId: REWARD_AD_ID },
          onEvent: (e) => {
            if (e.type === "loaded") setState("ready");
          },
          onError: (e) => {
            setErr(String((e as Error)?.message ?? e));
            setState("failed");
          },
        });
      } catch (e) {
        setErr(String((e as Error)?.message ?? e));
        setState("failed");
      }
    }, 2500);
    // 12초 안에 로드되지 않으면 광고 없이 열어 준다.
    const giveUp = window.setTimeout(() => setState((cur) => (cur === "loading" ? "failed" : cur)), 12000);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(giveUp);
      unregister?.();
    };
  }, [gated, unlocked]);

  const open = !gated || unlocked || state === "failed";

  function run(onDone: () => void) {
    if (open) {
      onDone();
      return;
    }
    track("reward_click");
    let done = false;
    const finish = (earned: boolean) => {
      if (done) return;
      done = true;
      if (earned) {
        writeStore(KEY_REWARD_DAY, todayKst());
        setUnlocked(true);
        track("reward_earned");
      }
      onDone();
    };
    if (import.meta.env.DEV || !REWARD_AD_ID) {
      finish(true);
      return;
    }
    try {
      showFullScreenAd({
        options: { adGroupId: REWARD_AD_ID },
        onEvent: (e) => {
          // 광고를 끝까지 봤을 때만 보상으로 기록한다(닫기만 하면 결과는 열지 않는다).
          if (e.type === "userEarnedReward") finish(true);
          if (e.type === "failedToShow") {
            setState("failed");
            finish(false);
          }
        },
        onError: () => {
          setState("failed");
          finish(false);
        },
      });
    } catch {
      setState("failed");
      finish(false);
    }
  }

  // 테스트 QR(intoss-private)로 열었을 때만 광고 상태를 한 줄 보여 준다(출시 버전에서는 숨김).
  let diag = "";
  try {
    if (!String(getSchemeUri()).startsWith("intoss-private")) throw new Error("");
    diag = `광고진단 id=${!!REWARD_AD_ID} load=${safeSupported(loadFullScreenAd)} show=${safeSupported(showFullScreenAd)} ver=${getTossAppVersion()} env=${getOperationalEnvironment()} state=${state} unlocked=${unlocked}${err ? " err=" + err : ""}`;
  } catch {
    diag = ""; // 출시 버전에서는 진단 줄을 보여 주지 않는다(테스트 QR로 연 경우에만 표시).
  }

  return {
    diag,
    run,
    /** 광고를 거쳐야 하는 상태(버튼 문구·안내 표시용) */
    needsAd: !open,
    disabled: !open && state === "loading",
    label: (base: string) => (open ? base : state === "ready" ? "광고 보고 내 사주 공짜로 보기" : "광고 준비 중..."),
  };
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

/** 입력 전에 "무엇을 얻는지" 먼저 보여 주는 예시 카드(고정 예시, 개인정보 없음). */
function SampleCard() {
  const page = ILGAN_PAGES[0];
  const type = getTypeProfile(page.gan);
  return (
    <section className="card type-card">
      <div className="eyebrow">이런 결과가 나와요 · 예시</div>
      <div className="type-name">{type.typeName}</div>
      <div className="chips">
        {page.keywords.map((k) => (
          <span key={k} className="chip">#{k}</span>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>내 타입·오행 비율·오늘의 운세까지 생일만 넣으면 바로 보여요.</p>
    </section>
  );
}

/** 결제 상품 "나 사용설명서 6장" 카드. 구매 전에 AI가 작성한다는 점을 먼저 알리고(생성형 AI 고지), 결제는 토스 인앱 결제로만 한다. */
function ManualBuyCard({
  form,
  purchase,
  onPurchased,
  onOpenManual,
  onAddHour,
}: {
  form: Form;
  purchase: Purchase | null;
  onPurchased: (p: Purchase) => void;
  onOpenManual: () => void;
  onAddHour: (hour: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!iapAvailable()) return null;

  if (purchase) {
    return (
      <section className="card reward">
        <h2>나 사용설명서 6장</h2>
        <p className="muted" style={{ fontSize: 14 }}>구매한 사용설명서를 다시 열 수 있어요.</p>
        <button type="button" className="cta" style={{ marginTop: 12 }} onClick={onOpenManual}>내 사용설명서 열기</button>
      </section>
    );
  }

  function buy() {
    setError(null);
    setBusy(true);
    track("iap_click");
    buyManual(toInput(form), {
      onSuccess: (p) => {
        setBusy(false);
        track("iap_success");
        onPurchased(p);
      },
      onError: (message) => {
        setBusy(false);
        setError(message);
      },
    });
  }

  return (
    <section className="card reward">
      <h2>나 사용설명서 6장</h2>
      <p className="muted" style={{ fontSize: 14 }}>
        내 사주로 만드는 나만의 6장이에요. 읽고 나면 오늘부터 바로 써먹을 말과 행동이 남아요.
      </p>
      <ol className="list" style={{ marginTop: 10, paddingLeft: 20 }}>
        {Object.entries(CHAPTER_PROMISES).map(([key, promise]) => (
          <li key={key}>
            <b>{CHAPTER_TITLES[key]}</b> — {promise}
          </li>
        ))}
      </ol>
      {form.unknownTime && (
        <div style={{ marginTop: 12 }}>
          <span className="muted" style={{ fontSize: 13 }}>태어난 시간을 알면 선택해 주세요. 시기·타이밍 해석이 더 정확해져요.</span>
          <select value="" onChange={(e) => onAddHour(e.target.value)} style={{ marginTop: 6, width: "100%" }}>
            <option value="">시간 선택 (모르면 그대로 구매해도 돼요)</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>{String(h).padStart(2, "0")}시</option>
            ))}
          </select>
        </div>
      )}
      <button type="button" className="cta" style={{ marginTop: 12 }} disabled={busy} onClick={buy}>
        {busy ? "결제 진행 중..." : "4,895원으로 나 사용설명서 열기"}
      </button>
      <p className="muted" style={{ fontSize: 11, marginTop: 8, textAlign: "center" }}>
        한국 전통 사주 명리학을 바탕으로 AI가 작성해요 · 생성에 1~3분
      </p>
      {error && <p className="muted" style={{ color: "#e3543f", fontSize: 13, marginTop: 8 }}>{error}</p>}
    </section>
  );
}

/** 구매한 사용설명서 화면. 장마다 생성되는 대로 이어 붙여 보여 준다. */
/** 결과 화면 맨 위의 2027 신년운세 카드 + 구매. 신년운세 상품(SKU)이 없거나 지원하지 않는 토스 버전이면 카드를 그리지 않는다. */
function NewYearCard({
  result,
  form,
  purchase,
  onPurchased,
  onOpen,
}: {
  result: SajuResult;
  form: Form;
  purchase: Purchase | null;
  onPurchased: (p: Purchase) => void;
  onOpen: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const variant = useMemo(() => getVariant(), []);
  if (!iapAvailable("newYear")) return null;

  function open() {
    nyTrack("ny_open_click", { variant, purchased: !!purchase });
    if (purchase) {
      onOpen();
      return;
    }
    setError(null);
    setBusy(true);
    buyProduct("newYear", toInput(form), {
      onSuccess: (p) => {
        setBusy(false);
        nyTrack("ny_purchase", { variant, year: NY_YEAR });
        onPurchased(p);
      },
      onError: (message) => {
        setBusy(false);
        setError(message);
      },
    });
  }

  return <NewYearTeaser result={result} variant={variant} purchased={!!purchase} busy={busy} error={error} onOpen={open} />;
}

function ManualScreen({ purchase, onBack }: { purchase: Purchase; onBack: () => void }) {
  const [chapters, setChapters] = useState<{ key: string; text: string }[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 6 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    track("screen_manual");
    loadManual(purchase, (key, text, pr) => {
      if (!alive) return;
      setChapters((prev) => (prev.some((c) => c.key === key) ? prev : [...prev, { key, text }]));
      setProgress(pr);
    }).catch((e) => {
      if (alive) setError(e instanceof Error ? e.message : "불러오지 못했어요.");
    });
    return () => {
      alive = false;
    };
  }, [purchase]);

  const finished = progress.total > 0 && progress.done >= progress.total;
  return (
    <main className="page">
      <header className="hero">
        <div className="eyebrow">AI가 작성한 결과</div>
        <h1>나 사용설명서</h1>
        <p>{finished ? "6장이 모두 준비됐어요." : `작성 중이에요 (${progress.done}/${progress.total}장). 먼저 나온 장부터 읽어 보세요.`}</p>
      </header>

      {chapters.map((c, i) => (
        <section key={c.key} className="card">
          <h2>{i + 1}. {CHAPTER_TITLES[c.key] ?? c.key}</h2>
          <p style={{ whiteSpace: "pre-line" }}>{c.text}</p>
        </section>
      ))}

      {!finished && !error && <p className="muted" style={{ textAlign: "center" }}>다음 장을 작성하고 있어요...</p>}
      {error && <p className="muted" style={{ textAlign: "center", color: "#e3543f" }}>{error}</p>}

      <button type="button" className="ghost" onClick={onBack}>돌아가기</button>
      <p className="foot">이 내용은 AI가 작성한 결과물이며, 전통 명리학 해석을 바탕으로 한 참고용이에요.</p>
    </main>
  );
}

function ResultScreen({
  result,
  form,
  purchase,
  onPurchased,
  onOpenManual,
  nyPurchase,
  onNyPurchased,
  onOpenNy,
  onAddHour,
  onOther,
}: {
  result: SajuResult;
  form: Form;
  purchase: Purchase | null;
  onPurchased: (p: Purchase) => void;
  onOpenManual: () => void;
  nyPurchase: Purchase | null;
  onNyPurchased: (p: Purchase) => void;
  onOpenNy: () => void;
  onAddHour: (hour: string) => void;
  onOther: () => void;
}) {
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

      {/* v11: 결과를 열자마자 보이는 자리(광고 보고 결과가 열린 직후 처음 보이는 카드)에 내년 신년운세 */}
      <NewYearCard result={result} form={form} purchase={nyPurchase} onPurchased={onNyPurchased} onOpen={onOpenNy} />

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


      {form.unknownTime && (
        <section className="card">
          <h2>태어난 시간을 알면 더 정확해져요</h2>
          <p className="muted" style={{ fontSize: 14 }}>시간을 넣으면 시주까지 포함해 다시 계산해요. 서버로 보내지 않고 이 폰 안에서만 계산해요.</p>
          <select value="" onChange={(e) => onAddHour(e.target.value)} style={{ marginTop: 10, width: "100%" }}>
            <option value="">시간 선택</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>{String(h).padStart(2, "0")}시</option>
            ))}
          </select>
        </section>
      )}

      <ManualBuyCard form={form} purchase={purchase} onPurchased={onPurchased} onOpenManual={onOpenManual} onAddHour={onAddHour} />

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
