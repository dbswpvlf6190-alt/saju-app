import { useEffect, useMemo } from "react";
import type { SajuResult } from "@saju/types";
import { currentYearKst, getYearTheme } from "@saju/goodYears";
import { getYearFlow, topMonths } from "@saju/monthPreview";
import "./v11.css";

// v11 결과 화면 맨 위 카드(2026-10-23 설계, 10/26 v10 코드에 연결 예정).
// 토스 손님은 50대 이상 77%·여성 65%(콘솔 10/23). 결제를 망설이는 이유는 금액보다 ① 믿음(정기결제·사기 걱정)
// ② 내용을 미리 못 봄 ③ 무엇을 사는지 모름.
// 사장님 피드백(10/23): 1월 한 달을 통째로 보여주면 "나머지도 같은 내용 반복"으로 느껴진다 →
// 열두 달 흐름 그래프(달마다 다르다는 것)와 가장 좋은 달을 무료로 보여주고, 그 달의 좋은 날짜·할 일은 잠가 둔다.
// 모두 계산값(monthPreview.ts)이라 AI 비용이 없고 같은 생일이면 같은 답. 금지: 겁주기·건강·단정·가짜 마감.

const SENIOR_THEME: Record<string, { label: string; line: string }> = {
  재성: { label: "재물이 붙는 해", line: "애쓴 만큼 재물과 결실이 따라오는 흐름으로 봐요." },
  관성: { label: "자리와 명예가 서는 해", line: "맡은 자리가 든든해지고 좋은 인연이 닿는 흐름으로 봐요." },
  인성: { label: "귀인이 돕는 해", line: "도와주는 사람이 곁에 생기고 마음이 편안해지는 흐름으로 봐요." },
  식상: { label: "재주가 빛나는 해", line: "하고 싶던 일을 펼치고, 솜씨를 알아봐 주는 흐름으로 봐요." },
  비겁: { label: "내 힘으로 일어서는 해", line: "스스로 판을 짜고 내 편이 늘어나는 흐름으로 봐요." },
};

export type TeaserVariant = "A" | "B";
const BUTTON_TEXT: Record<TeaserVariant, string> = {
  A: "열두 달 풀이 열기",
  B: "좋은 날짜 확인하기",
};

export interface NewYearTeaserProps {
  result: SajuResult;
  priceLabel: string; // 콘솔 판매가와 같게 — "3,894원"
  pricePerDay?: string; // 예: "하루 약 11원꼴"
  variant?: TeaserVariant;
  purchased?: boolean;
  busy?: boolean;
  onOpen: () => void; // 구매(이미 샀으면 신년운세 화면 열기)
  onView?: (info: { year: number; group: string; variant: TeaserVariant; best: number[] }) => void;
}

export function NewYearTeaser({ result, priceLabel, pricePerDay, variant = "A", purchased, busy, onOpen, onView }: NewYearTeaserProps) {
  const year = currentYearKst() + 1;
  const theme = useMemo(() => getYearTheme(result, year), [result, year]);
  const flow = useMemo(() => getYearFlow(result, year), [result, year]);
  const best = useMemo(() => topMonths(flow, 2).sort((a, b) => a.month - b.month), [flow]);
  const bestSet = new Set(best.map((m) => m.month));
  const top = topMonths(flow, 1)[0];
  // 막대는 그 사람 안에서의 상대 높이(가장 낮은 달 25% ~ 가장 높은 달 100%) — 달마다 다르다는 걸 한눈에.
  const lo = Math.min(...flow.map((m) => m.score));
  const hi = Math.max(...flow.map((m) => m.score));
  const barHeight = (score: number) => (hi === lo ? 70 : 25 + (75 * (score - lo)) / (hi - lo));
  const words = SENIOR_THEME[theme.group];

  useEffect(() => {
    onView?.({ year, group: theme.group, variant, best: best.map((m) => m.month) });
    // 카드가 처음 보일 때 한 번만 기록
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="card ny-card" aria-label={`${year}년 신년운세 미리보기`}>
      <div className="ny-eyebrow">{year}년 {theme.ganzhiKor}년 신년운세</div>
      <h2 className="ny-head">
        내년 {year}년은
        <br />
        <em>{words.label}</em>로 봐요
      </h2>
      <p className="ny-line">{words.line}</p>

      <div className="ny-flow">
        <div className="ny-flow-title">{year}년 열두 달 흐름</div>
        <div className="ny-bars" role="img" aria-label={`흐름이 좋은 달: ${best.map((m) => `${m.month}월`).join(", ")}`}>
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
          흐름이 가장 좋은 달은{" "}
          <b>
            {best.map((m) => `${m.month}월`).join(" · ")}
          </b>
          이에요
        </p>
      </div>

      {!purchased && top && (
        <div className="ny-locked">
          <div className="ny-locked-head">
            {top.month}월 · {top.title}
          </div>
          <div className="ny-locked-rows" aria-hidden="true">
            <div><span className="k">좋은 날</span><span className="v blur">{top.month}월 ○일 · ○일 · ○일</span></div>
            <div><span className="k">재물</span><span className="v blur">들어오는 돈을 챙기기 좋은 때와 방법</span></div>
            <div><span className="k">가족·사람</span><span className="v blur">이달에 마음 쓰면 좋은 사람</span></div>
            <div><span className="k">할 일</span><span className="v blur">이날 전후로 하면 좋은 일</span></div>
          </div>
          <div className="ny-lock-note">🔒 달마다 다른 좋은 날짜와 할 일은 열두 달 풀이에서 알려드려요</div>
        </div>
      )}

      <button className="cta ny-cta" onClick={onOpen} disabled={busy}>
        {purchased ? `${year}년 신년운세 다시 보기` : busy ? "결제 준비 중이에요…" : `${BUTTON_TEXT[variant]} · ${priceLabel}`}
      </button>
      {!purchased && (
        <p className="ny-trust">
          토스로 <b>한 번만</b> 결제해요 · 자동 결제 없어요
          <br />
          {/* AI 작성 고지(인공지능기본법·소비자 고지): 사는 물건 이름 바로 옆에 짧게 — 사장님 결정(10/23)으로 "(AI)" 표시 */}
          열두 달 풀이<span className="ny-ai">(AI)</span>{pricePerDay ? ` · ${pricePerDay}` : ""}
          <br />
          산 풀이는 다시 열어볼 수 있어요
        </p>
      )}
          </section>
  );
}
