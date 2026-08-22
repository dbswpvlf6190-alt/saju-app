import type { Pillar } from "@/lib/saju";
import { WUXING_COLOR_VAR } from "./wuxingColors";

export function PillarCard({ label, pillar }: { label: string; pillar: Pillar | null }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-border-subtle bg-background-card/70 px-3 py-4">
      <span className="text-xs font-medium tracking-wide text-foreground-muted">{label}</span>
      {pillar ? (
        <>
          <span className="font-serif text-2xl text-accent-gold-soft">{pillar.ganZhiHanja}</span>
          <span className="text-sm text-foreground">{pillar.ganZhiKor}</span>
          <div className="flex gap-1.5">
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium text-background"
              style={{ backgroundColor: WUXING_COLOR_VAR[pillar.ganWuxing] }}
            >
              {pillar.ganWuxing}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium text-background"
              style={{ backgroundColor: WUXING_COLOR_VAR[pillar.zhiWuxing] }}
            >
              {pillar.zhiWuxing}
            </span>
          </div>
        </>
      ) : (
        <span className="py-3 text-sm text-foreground-muted">시간 미상</span>
      )}
    </div>
  );
}
