import { parseNewYearText } from "@/lib/newYear/format";
import type { NewYearMonthCard } from "@/lib/newYear/preview";
import { NewYearMonthCards } from "./NewYearMonthCards";

/**
 * 신년운세 본문 표시. v2 글은 소제목과 월별 줄을 나눠 보여주고, 예전(v1) 글은 문단 그대로 보여준다.
 * cards(계산한 달 카드)가 있으면 AI 글의 "월별 흐름" 자리에 달 카드 12장을 넣고, AI의 월별 한 줄은 카드 안에 붙인다(2026-11-17).
 * "월별 흐름" 소제목이 없는 글이면 맨 끝에 붙인다.
 */
export function NewYearReportText({ text, cards }: { text: string; cards?: NewYearMonthCard[] }) {
  const blocks = parseNewYearText(text);
  const monthLines: Record<number, string> = {};
  for (const b of blocks) if (b.kind === "month") monthLines[b.month] = b.text;
  const hasMonthlyHeading = blocks.some((b) => b.kind === "heading" && b.text.includes("월별"));
  const cardsBlock = cards && cards.length > 0 && (
    <div key="cards" className="my-2 flex flex-col gap-3">
      <h4 className="text-sm font-semibold text-accent-gold-soft">열두 달 풀이 · 좋은 날짜</h4>
      <NewYearMonthCards cards={cards} monthLines={monthLines} />
    </div>
  );

  return (
    <div className="flex flex-col gap-2 text-left">
      {blocks.map((b, i) => {
        if (b.kind === "heading") {
          if (cardsBlock && b.text.includes("월별")) return cardsBlock;
          return (
            <h4 key={i} className="mt-3 text-sm font-semibold text-accent-gold-soft first:mt-0">
              {b.text}
            </h4>
          );
        }
        if (b.kind === "month") {
          if (cardsBlock) return null;
          return (
            <p key={i} className="flex gap-3 text-sm leading-relaxed text-foreground">
              <span className="w-9 shrink-0 font-medium text-accent-gold-soft">{b.month}월</span>
              <span>{b.text}</span>
            </p>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line text-sm leading-relaxed text-foreground">
            {b.text}
          </p>
        );
      })}
      {cardsBlock && !hasMonthlyHeading && cardsBlock}
    </div>
  );
}
