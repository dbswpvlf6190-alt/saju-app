import { parseNewYearText } from "@/lib/newYear/format";

/** 신년운세 본문 표시. v2 글은 소제목과 월별 줄을 나눠 보여주고, 예전(v1) 글은 문단 그대로 보여준다. */
export function NewYearReportText({ text }: { text: string }) {
  const blocks = parseNewYearText(text);
  return (
    <div className="flex flex-col gap-2 text-left">
      {blocks.map((b, i) => {
        if (b.kind === "heading") {
          return (
            <h4 key={i} className="mt-3 text-sm font-semibold text-[#e8a37f] first:mt-0">
              {b.text}
            </h4>
          );
        }
        if (b.kind === "month") {
          return (
            <p key={i} className="flex gap-3 text-sm leading-relaxed text-foreground">
              <span className="w-9 shrink-0 font-medium text-[#e8a37f]">{b.month}월</span>
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
    </div>
  );
}
