import { useEffect, useMemo } from "react";
import type { SajuResult } from "@saju/types";
import { currentYearKst, getGoodYears, getYearTheme } from "@saju/goodYears";
import "./v11.css";

// v11 결과 화면 카드(2026-10-23 설계, 10/26 v10 코드에 연결 예정): 무료로 "내 2027년은 ○○의 해"와 앞으로의 좋은 해를
// 보여주고, 월별로 언제 움직일지는 2027 신년운세(인앱 결제)로 잇는다. 웹 GoodYearCard(상세 버튼 22%)를 토스로 옮긴 것.
// 토스 v10 결과 화면: 결과 본 360명 중 구매 클릭 1명(0.3%) → 목표 1% 이상.
// 단정 금지 — "~로 봐요"까지. 잠긴 월별 줄은 실제 신년운세 내용(월별 흐름)과 같은 항목만 보여준다.

const MONTH_PREVIEW = ["1~2월", "3~4월", "5~6월", "7~8월", "9~10월", "11~12월"];

export interface NewYearTeaserProps {
  result: SajuResult;
  priceLabel: string; // 예: "3,900원" — 콘솔 등록 판매가와 같게
  purchased?: boolean;
  busy?: boolean;
  onOpen: () => void; // 구매(또는 이미 샀으면 신년운세 화면 열기)
  onView?: (year: number, group: string) => void; // 카드가 보였을 때(이벤트 기록용)
}

export function NewYearTeaser({ result, priceLabel, purchased, busy, onOpen, onView }: NewYearTeaserProps) {
  const nextYear = currentYearKst() + 1;
  const theme = useMemo(() => getYearTheme(result, nextYear), [result, nextYear]);
  // 내년 다음부터의 좋은 해 하나 — "그다음 흐름"까지 보여주면 기대감이 이어진다(웹 카드와 같은 기준).
  const later = useMemo(() => getGoodYears(result, nextYear + 1, 4, 1)[0], [result, nextYear]);

  useEffect(() => {
    onView?.(theme.year, theme.group);
    // 카드가 처음 보일 때 한 번만 기록
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="card ny-card" aria-label={`${theme.year} 신년운세 미리보기`}>
      <div className="ny-eyebrow">나의 {theme.year}년 미리보기</div>
      <div className="ny-year">
        {theme.year} <span>{theme.ganzhiKor}년</span>
      </div>
      <div className="ny-label">{theme.label}</div>
      <p className="ny-line">{theme.line}</p>
      {later && (
        <p className="ny-later">
          그다음 흐름은 <b>{later.year}년 {later.ganzhiKor}년</b> · {later.label}
        </p>
      )}

      <div className="ny-locked" aria-hidden="true">
        {MONTH_PREVIEW.map((m) => (
          <div key={m} className="ny-row">
            <span className="ny-month">{m}</span>
            <span className="ny-blur" />
          </div>
        ))}
        {!purchased && <div className="ny-lock">🔒 {theme.year}년 월별 흐름은 신년운세에서 열려요</div>}
      </div>

      <ul className="ny-points">
        <li>{theme.year}년 한 해 흐름과 달마다 움직이기 좋은 때·쉬어 갈 때</li>
        <li>돈·일·사람 관계에서 이 해에 잡을 것</li>
      </ul>

      <button className="cta" onClick={onOpen} disabled={busy}>
        {purchased ? `${theme.year} 신년운세 보기` : busy ? "결제 준비 중…" : `${theme.year} 신년운세 열기 · ${priceLabel}`}
      </button>
      <p className="ny-note">태어난 날의 기운과 해·달마다 들어오는 기운의 관계로 본 전통 해석이에요. 풀이 문장은 AI가 작성해요.</p>
    </section>
  );
}
