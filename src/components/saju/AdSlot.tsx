/**
 * 광고 자리 표시자. 실제 광고 네트워크(애드센스, 카카오 애드핏 등) 심사가 끝나면
 * 이 컴포넌트 내부만 해당 네트워크의 스니펫으로 교체하면 된다.
 * 유료 결제 사용자에게는 상위(ResultView)에서 아예 렌더링하지 않는 방식으로 광고 제거 혜택을 준다.
 */
export function AdSlot({ label = "광고" }: { label?: string }) {
  return (
    <div
      className="flex min-h-24 w-full flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-border-subtle bg-background-elevated/50 p-4 text-center"
      aria-label="광고 영역"
    >
      <span className="text-[11px] uppercase tracking-wide text-foreground-muted/60">{label}</span>
      <span className="text-xs text-foreground-muted/60">광고 영역 (준비중)</span>
    </div>
  );
}
