import { useEffect, useMemo } from "react";
import type { SajuResult } from "@saju/types";
import { currentYearKst, getYearTheme } from "@saju/goodYears";
import "./v11.css";

// v11 결과 화면 맨 위 카드(2026-10-23 설계, 10/26 v10 코드에 연결 예정).
// 토스 손님은 50대 이상 77%·여성 65%(콘솔 10/23). 이 연령층이 결제를 망설이는 이유는 금액보다
// ① 믿음(정기결제·사기 걱정) ② 내용 확인 불가 ③ 무엇을 사는지 모름 → 순서대로 안심 문구·1월 무료 맛보기·익숙한 말로 푼다.
// 금지: 겁주기·건강·단정("반드시")·가짜 마감. 문구는 존댓말, 글자는 크게.
// 목표: 결과 본 사람 대비 구매 클릭 0.3%(v10) → 1% 이상. 버튼 문구 A/B는 variant로 나눠 기록한다.

/** 이 연령층에 익숙한 말로 바꾼 한 해의 기운(같은 계산: getYearTheme). 사이트·Threads 문구와 뜻은 같다. */
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
  B: "좋은 달 확인하기",
};

export interface FreeMonth {
  label: string; // 예: "1월"
  text: string; // 신년운세 리포트의 1월 풀이(실제 내용). 없으면 맛보기 칸을 숨긴다.
}

export interface NewYearTeaserProps {
  result: SajuResult;
  priceLabel: string; // 콘솔 판매가와 같게 — "3,894원"
  pricePerDay?: string; // 예: "하루 약 11원꼴"
  freeMonth?: FreeMonth;
  variant?: TeaserVariant;
  purchased?: boolean;
  busy?: boolean;
  onOpen: () => void; // 구매(이미 샀으면 신년운세 화면 열기)
  onView?: (info: { year: number; group: string; variant: TeaserVariant }) => void;
}

const LOCKED_MONTHS = ["2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

export function NewYearTeaser({ result, priceLabel, pricePerDay, freeMonth, variant = "A", purchased, busy, onOpen, onView }: NewYearTeaserProps) {
  const nextYear = currentYearKst() + 1;
  const theme = useMemo(() => getYearTheme(result, nextYear), [result, nextYear]);
  const words = SENIOR_THEME[theme.group];

  useEffect(() => {
    onView?.({ year: theme.year, group: theme.group, variant });
    // 카드가 처음 보일 때 한 번만 기록
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="card ny-card" aria-label={`${theme.year}년 신년운세 미리보기`}>
      <div className="ny-eyebrow">{theme.year}년 {theme.ganzhiKor}년 신년운세</div>
      <h2 className="ny-head">
        내년 {theme.year}년은
        <br />
        <em>{words.label}</em>로 봐요
      </h2>
      <p className="ny-line">{words.line}</p>

      {freeMonth && (
        <div className="ny-free">
          <div className="ny-free-tag">무료로 먼저 보여드려요</div>
          <div className="ny-free-month">{theme.year}년 {freeMonth.label}</div>
          <p className="ny-free-text">{freeMonth.text}</p>
        </div>
      )}

      {!purchased && (
        <div className="ny-locked" aria-hidden="true">
          <div className="ny-grid">
            {LOCKED_MONTHS.map((m) => (
              <span key={m} className="ny-chip">
                {m}
              </span>
            ))}
          </div>
          <div className="ny-lock">
            🔒 나머지 열한 달 중
            <br />
            특히 좋은 달은 언제일까요?
          </div>
        </div>
      )}

      <button className="cta ny-cta" onClick={onOpen} disabled={busy}>
        {purchased ? `${theme.year}년 신년운세 다시 보기` : busy ? "결제 준비 중이에요…" : `${BUTTON_TEXT[variant]} · ${priceLabel}`}
      </button>
      {!purchased && (
        <p className="ny-trust">
          토스로 <b>한 번만</b> 결제해요 · 자동 결제 없어요
          <br />
          {pricePerDay ? `열두 달 풀이 · ${pricePerDay}` : "열두 달 풀이"}
          <br />
          산 풀이는 다시 열어볼 수 있어요
        </p>
      )}
      <p className="ny-note">태어난 날의 기운과 해·달마다 들어오는 기운의 관계로 본 전통 해석이에요. 풀이 문장은 AI가 작성해요.</p>
    </section>
  );
}
