export interface ReportSectionItem {
  key: string;
  title: string;
}

/** 결제 후 열린 리포트 본문 목록. 새 방식(6장)과 옛 방식(주제 5개·1가지)이 같은 모양을 쓴다. 아직 안 온 항목은 "불러오는 중", 실패한 항목은 재시도 안내. */
export function ReportSections({
  items,
  sections,
  missing,
}: {
  items: ReportSectionItem[];
  sections: Record<string, string>;
  missing: string[];
}) {
  return (
    <>
      {items.map((section) => {
        const text = sections[section.key];
        const isMissing = missing.includes(section.key);
        return (
          <div key={section.key} className="rounded-2xl border border-border-subtle bg-background-card/70 p-4">
            <h4 className="font-medium text-accent-gold-soft">{section.title}</h4>
            {text ? (
              <p className="mt-2 whitespace-pre-line leading-relaxed text-foreground">{text}</p>
            ) : (
              isMissing ? (
                <p className="mt-2 text-sm text-foreground-muted">생성에 실패했어요. 아래에서 다시 시도해 주세요.</p>
              ) : (
                <div className="mt-2 flex flex-col gap-2" aria-label="불러오는 중...">
                  <p className="text-sm text-foreground-muted">불러오는 중... 이 장을 쓰고 있어요</p>
                  <div className="h-3 w-full animate-pulse rounded bg-background-elevated" />
                  <div className="h-3 w-5/6 animate-pulse rounded bg-background-elevated" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-background-elevated" />
                </div>
              )
            )}
          </div>
        );
      })}
    </>
  );
}
