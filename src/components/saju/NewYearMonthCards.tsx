import type { NewYearMonthCard } from "@/lib/newYear/preview";

// 신년운세를 산 사람이 보는 달 카드 12장(2026-11-17, 토스 v11 유료 화면을 웹으로).
// 결제 전 미리보기가 약속한 것 — 달마다 좋은 날짜·요일, 재물·가족·할 일 — 을 계산값 그대로 보여 준다.
// AI 글의 "월별 흐름" 한 줄은 있으면 카드에 붙이고(monthLines), 본문에서는 빼서 같은 내용을 두 번 보이지 않게 한다.

export function NewYearMonthCards({ cards, monthLines }: { cards: NewYearMonthCard[]; monthLines?: Record<number, string> }) {
  return (
    <div className="flex flex-col gap-3">
      {cards.map((c) => (
        <section
          key={c.month}
          className={`flex flex-col gap-2.5 rounded-2xl border px-4 py-4 text-left ${
            c.best ? "border-[#b8955a] bg-[#fbf7ef]" : "border-border-subtle bg-background-card/70"
          }`}
        >
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-serif text-xl text-foreground">{c.month}월</span>
            <span className="text-base text-accent-gold-soft">{c.title}</span>
            {c.best && <span className="ml-auto text-xs font-medium text-accent-gold-soft">★ 흐름이 좋은 달</span>}
          </div>
          {c.month === 1 && (
            <p className="text-xs leading-relaxed text-foreground-muted">
              사주에서는 입춘(2월 4일경)부터 새해로 봐요. 1월은 아직 지난해 기운이 이어지는 달이에요.
            </p>
          )}
          {monthLines?.[c.month] && <p className="text-sm leading-relaxed text-foreground">{monthLines[c.month]}</p>}
          <dl className="flex flex-col gap-2 text-sm leading-relaxed">
            <div className="flex gap-3">
              <dt className="w-12 shrink-0 font-medium text-foreground-muted">좋은 날</dt>
              <dd className="flex flex-wrap gap-1.5">
                {c.goodDays.length > 0 ? (
                  c.goodDays.map((d) => (
                    <span key={d.day} className="rounded-md border border-[#dccba6] bg-background-elevated px-2 py-0.5 text-foreground">
                      {d.day}일({d.weekday})
                    </span>
                  ))
                ) : (
                  <span className="text-foreground-muted">이달은 무리하지 않고 쉬어 가는 날이 많아요</span>
                )}
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-12 shrink-0 font-medium text-foreground-muted">재물</dt>
              <dd className="text-foreground">{c.money}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-12 shrink-0 font-medium text-foreground-muted">사람</dt>
              <dd className="text-foreground">{c.people}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-12 shrink-0 font-medium text-foreground-muted">할 일</dt>
              <dd className="text-foreground">{c.tip}</dd>
            </div>
          </dl>
        </section>
      ))}
    </div>
  );
}
