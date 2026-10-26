import { useEffect, useMemo } from "react";
import type { SajuResult } from "@saju/types";
import { buildNewYearHook, formatDay, monthList, perDayLabel } from "@saju/newYearHook";
import { NY_PRICE_KRW, NY_PRICE_LABEL, NY_YEAR, nyTrack, yearWord, type TeaserVariant } from "./ny";
import "./v11.css";

// v11 결과 화면 맨 위 카드("나의 2027년 미리보기").
// 목표: 결과를 본 사람이 이 카드에서 "내 이야기다, 열어 보고 싶다"고 느끼게 한다(구매 클릭 0.3% → 1%↑).
// 토스 손님은 50대 이상 77%·여성 65%이고, 결제를 망설이는 이유는 금액보다 ① 믿음 ② 내용을 미리 못 봄 ③ 무엇을 사는지 모름.
// 그래서 순서는: 내 한 해 이름 → 흐름이 가장 좋은 달 + 그 달의 **진짜 좋은 날 하루를 먼저 공개**(나머지는 잠금) →
// 열두 달 그래프 → 받는 것을 숫자로 → 버튼 → 안심 문구. 전부 계산값이라 같은 생일이면 언제 봐도 같은 답이다.
// 쓰지 않음: 겁주기·건강·단정·가짜 마감·가짜 후기·가짜 숫자(흐리게 가린 가짜 글자 포함).

export interface NewYearTeaserProps {
  result: SajuResult;
  variant: TeaserVariant;
  purchased: boolean;
  busy: boolean;
  error?: string | null;
  onOpen: () => void; // 구매(이미 샀으면 신년운세 화면 열기)
}

export function NewYearTeaser({ result, variant, purchased, busy, error, onOpen }: NewYearTeaserProps) {
  const hook = useMemo(() => buildNewYearHook(result, NY_YEAR), [result]);
  const { year, top, best, freeDay, flow } = hook;
  const bestSet = new Set(best.map((m) => m.month));
  // 막대는 그 사람 안에서의 상대 높이(가장 낮은 달 25% ~ 가장 높은 달 100%) — 달마다 다르다는 걸 한눈에.
  const lo = Math.min(...flow.map((m) => m.score));
  const hi = Math.max(...flow.map((m) => m.score));
  const barHeight = (score: number) => (hi === lo ? 70 : 25 + (75 * (score - lo)) / (hi - lo));

  useEffect(() => {
    nyTrack("ny_teaser_view", { year, group: hook.group, variant, best: best.map((m) => m.month).join(","), purchased });
    // 카드가 처음 보일 때 한 번만 기록
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buttonText = purchased
    ? `${year}년 신년운세 다시 보기`
    : busy
      ? "결제 준비 중이에요…"
      : `${variant === "B" ? `좋은 날 ${hook.totalGoodDays}일 확인하기` : "열두 달 풀이 열기"} · ${NY_PRICE_LABEL}`;

  return (
    <section className="card ny-card" aria-label={`${year}년 신년운세 미리보기`}>
      <div className="ny-eyebrow">🎍 {year}년 {hook.ganzhiKor}년 · 나의 신년운세</div>
      <h2 className="ny-head">
        {yearWord(year)} {year}년은
        <br />
        <em>{hook.label}</em>로 봐요
      </h2>
      <p className="ny-line">{hook.line}</p>

      <div className="ny-reveal">
        <div className="ny-reveal-kicker">★ 흐름이 가장 좋은 달</div>
        <div className="ny-reveal-month">
          {top.month}월 <span>{top.title}</span>
        </div>
        {freeDay && (
          <div className="ny-days" aria-label={`${top.month}월 좋은 날`}>
            <div className="ny-day free">
              <small>먼저 알려드려요</small>
              <b>{formatDay(freeDay)}</b>
            </div>
            {!purchased &&
              Array.from({ length: hook.lockedInTop }, (_, i) => (
                <div key={i} className="ny-day locked">
                  <small>열면 보여요</small>
                  <b>🔒</b>
                </div>
              ))}
          </div>
        )}
        <p className="ny-tip">💡 {top.tip}</p>
        {!purchased && (
          <p className="ny-reveal-note">
            🔒 {top.month}월의 재물·가족 이야기와 나머지 날짜는 열두 달 풀이에서 알려드려요
          </p>
        )}
      </div>

      <div className="ny-flow">
        <div className="ny-flow-title">{year}년 열두 달 흐름</div>
        <div className="ny-bars" role="img" aria-label={`흐름이 좋은 달: ${monthList(best.map((m) => m.month))}`}>
          {flow.map((m) => (
            <div key={m.month} className={`ny-bar${bestSet.has(m.month) ? " best" : ""}`}>
              <span className="ny-star">{bestSet.has(m.month) ? "★" : ""}</span>
              <span className="ny-track">
                <span className="ny-fill" style={{ height: `${barHeight(m.score)}%` }} />
              </span>
              <span className="ny-mon">{m.month}</span>
            </div>
          ))}
        </div>
        <p className="ny-best">
          흐름이 좋은 달은 <b>{monthList(best.map((m) => m.month))}</b>이에요
        </p>
        {hook.moneyMonths.length > 0 && (
          <p className="ny-money">
            💰 재물이 들어오는 달은 <b>{monthList(hook.moneyMonths)}</b>이에요
          </p>
        )}
      </div>

      {!purchased && (
        <ul className="ny-gets">
          <li>
            <b>내게 좋은 날 {hook.totalGoodDays}일</b>
            <span>달마다 날짜와 요일까지 알려드려요</span>
          </li>
          <li>
            <b>달마다 재물 · 가족 · 할 일</b>
            <span>열두 달 모두, 그 달 이름과 함께</span>
          </li>
          <li>
            <b>내 사주로 쓴 총평</b>
            <span>분기별 키워드와 실천 조언까지</span>
          </li>
        </ul>
      )}

      <button className="cta ny-cta" onClick={onOpen} disabled={busy}>
        {buttonText}
      </button>
      {error && <p className="ny-error">{error}</p>}
      {!purchased && (
        <p className="ny-trust">
          토스로 <b>한 번만</b> 결제해요 · 자동 결제 없어요
          <br />
          {/* AI 작성 고지: 사는 물건 이름 바로 옆에 짧게 — 사장님 결정(10/23)으로 "(AI)" 표시 */}
          열두 달 풀이<span className="ny-ai">(AI)</span> · {perDayLabel(NY_PRICE_KRW)}
          <br />
          산 풀이는 다시 열어볼 수 있어요
        </p>
      )}
    </section>
  );
}

/**
 * 다시 온 사람이 매일 보는 "오늘의 운세" 화면의 작은 카드. 내년 한 해 이름과 좋은 달만 보여 주고,
 * 눌러서 결과 화면(신년운세 카드가 맨 위)으로 간다. 이미 산 사람에게는 "다시 보기".
 */
export function NewYearMini({ result, purchased, onGo }: { result: SajuResult; purchased: boolean; onGo: () => void }) {
  const hook = useMemo(() => buildNewYearHook(result, NY_YEAR), [result]);
  useEffect(() => {
    nyTrack("ny_mini_view", { year: hook.year, group: hook.group, purchased });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <section className="card ny-mini" aria-label={`${hook.year}년 신년운세`}>
      <div className="ny-eyebrow">🎍 {hook.year}년 신년운세</div>
      <p className="ny-mini-line">
        {yearWord(hook.year)}은 <b>{hook.label}</b>로 봐요.
        <br />
        흐름이 가장 좋은 달은 <b>{monthList(hook.best.map((m) => m.month))}</b>이에요.
      </p>
      <button type="button" className="ny-mini-btn" onClick={onGo}>
        {purchased ? "내 신년운세 다시 보기" : "나의 2027년 좋은 날짜 보기"}
      </button>
    </section>
  );
}
