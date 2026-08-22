import type { WuXing } from "@/lib/saju";
import { WUXING_COLOR_VAR as COLOR_VAR } from "./wuxingColors";

const ORDER: WuXing[] = ["목", "화", "토", "금", "수"];

export function WuxingBar({ percent }: { percent: Record<WuXing, number> }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-background-elevated">
        {ORDER.map((key) =>
          percent[key] > 0 ? (
            <div
              key={key}
              style={{ width: `${percent[key]}%`, backgroundColor: COLOR_VAR[key] }}
              className="h-full first:rounded-l-full last:rounded-r-full"
            />
          ) : null,
        )}
      </div>
      <div className="grid grid-cols-5 gap-2 text-center">
        {ORDER.map((key) => (
          <div key={key} className="flex flex-col items-center gap-1">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: COLOR_VAR[key] }}
            />
            <span className="text-xs text-foreground-muted">{key}</span>
            <span className="text-sm font-medium text-foreground">{percent[key]}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
