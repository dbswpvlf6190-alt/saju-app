import { useEffect, useMemo, useRef, useState } from "react";
import { Share, TossAds } from "@apps-in-toss/web-framework";
import { calculateSaju } from "@saju/engine";
import type { SajuInput, SajuResult } from "@saju/types";
import { generateFreeContent } from "@saju/content";
import { getTypeProfile } from "@saju/typeProfile";
import { ILGAN_PAGES } from "@saju/ilganPages";
import { getDailyFortuneDetail } from "@saju/dailyFortune";
import type { WuXing } from "@saju/ganzhi";

// 토스 미니앱용 사주랩(무료 버전). 사이트와 같은 계산·문구를 쓰고, 사이트로 내보내는 링크는 넣지 않는다
// (앱인토스 정책: 외부 링크·자사 서비스 이동 유도 금지, SSR 금지). 수익은 인앱 광고(배너)로 — 광고 그룹 ID는
// 콘솔에서 만든 뒤 VITE_AD_BANNER_RESULT에 넣는다. 결과 화면이 실제로 보일 때만 붙인다(로딩·팝업 위 광고 금지).

const STORAGE_KEY = "sajulab:lastInput";
const BANNER_AD_ID = import.meta.env.VITE_AD_BANNER_RESULT as string | undefined;
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

export default function App() {
  const [form, setForm] = useState<Form>(() => loadSaved() ?? EMPTY);
  const [result, setResult] = useState<SajuResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 토스 내비게이션 바의 뒤로가기 = 브라우저 뒤로가기. 결과 화면에서 누르면 입력 화면으로, 첫 화면에서 누르면 미니앱 종료.
  useEffect(() => {
    const onPop = () => setResult(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

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
      window.history.pushState({ screen: "result" }, "");
      window.scrollTo(0, 0);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "입력값을 확인해 주세요.");
    }
  }

  if (result) return <ResultScreen result={result} onBack={() => window.history.back()} />;

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

function ResultScreen({ result, onBack }: { result: SajuResult; onBack: () => void }) {
  const free = useMemo(() => generateFreeContent(result), [result]);
  const type = useMemo(() => getTypeProfile(result.dayPillar.ganKor), [result]);
  const page = useMemo(() => ILGAN_PAGES.find((p) => p.gan === result.dayPillar.ganKor)!, [result]);
  const daily = useMemo(() => getDailyFortuneDetail(result), [result]);
  const pillars = [
    { label: "시주", p: result.timePillar },
    { label: "일주", p: result.dayPillar },
    { label: "월주", p: result.monthPillar },
    { label: "년주", p: result.yearPillar },
  ];

  async function shareResult() {
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

      <button type="button" className="cta" onClick={() => void shareResult()}>친구는 무슨 타입일까? 공유하기</button>
      <button type="button" className="ghost" onClick={onBack}>다른 생일로 다시 보기</button>
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
