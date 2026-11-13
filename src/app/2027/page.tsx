import type { Metadata } from "next";
import Link from "next/link";
import { DEFAULT_OG_IMAGE } from "@/lib/og/defaults";
import { SiteFooter } from "@/components/saju/SiteFooter";
import { Y2027View } from "@/components/saju/Y2027View";
import { TTI, Y2027, birthYearsOf, isSamjae2027, yearRelationLabel, yearTheme } from "@/lib/saju/year2027";

const TITLE = "2027년 띠별 운세 · 나이별 운세 | 정미년 신년운세 - 사주랩";
const DESCRIPTION =
  "2027년 정미년(붉은 양의 해) 열두 띠 운세와 1940~2009년생 나이별 운세를 한곳에. 띠별 좋은 달과 조심할 달, 2027 삼재띠(돼지·토끼·양 날삼재)까지 쉽게 정리했어요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/2027" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/2027", type: "website", images: [DEFAULT_OG_IMAGE] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
};

export default function Year2027Index() {
  const section = "flex flex-col gap-3 rounded-2xl border border-border-subtle bg-background-card/70 p-5";
  return (
    <div className="bg-starfield flex flex-1 flex-col items-center bg-background px-5 py-12">
      <Y2027View page="index" />
      <main className="flex w-full max-w-md flex-col gap-5">
        <header className="flex flex-col items-center gap-2 text-center">
          <span className="text-sm font-medium tracking-[0.15em] text-accent-gold-soft">2027 정미년(丁未年)</span>
          <h1 className="font-serif text-[1.7rem] leading-snug text-foreground">
            2027년 띠별 운세
            <br />
            나이별 운세
          </h1>
          <p className="text-base leading-relaxed text-foreground-muted">
            2027년은 {Y2027.color} 양의 해, 정미년이에요. 사주에서는 입춘({Y2027.ipchun} 무렵)부터 새해로 봐요. 내 띠나 태어난 해를 눌러 보세요.
          </p>
        </header>

        <Link href="/new-year?ref=y2027_index" className="rounded-2xl bg-cta px-4 py-4 text-center text-lg font-bold text-cta-ink">
          생일 넣고 내 2027년 운세 보기
        </Link>

        <section className={section}>
          <h2 className="font-serif text-xl text-accent-gold-soft">띠별 2027년 운세</h2>
          <ul className="flex flex-col gap-2">
            {TTI.map((t) => (
              <li key={t.slug}>
                <Link href={`/2027/${t.slug}`} className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-background-elevated px-4 py-3">
                  <span className="flex flex-col">
                    <strong className="text-base text-foreground">{t.animal}띠</strong>
                    <span className="text-sm text-foreground-muted">{yearTheme(t).headline}</span>
                  </span>
                  <span className={`shrink-0 text-sm ${isSamjae2027(t.branch) ? "text-red-700" : "text-accent-gold-soft"}`}>{yearRelationLabel(t)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className={section}>
          <h2 className="font-serif text-xl text-accent-gold-soft">태어난 해로 찾기</h2>
          {TTI.map((t) => (
            <div key={t.slug} className="flex flex-col gap-1.5">
              <strong className="text-base text-foreground">{t.animal}띠</strong>
              <ul className="flex flex-wrap gap-2">
                {birthYearsOf(t).map((y) => (
                  <li key={y}>
                    <Link href={`/2027/${y}`} className="inline-block rounded-full border border-border-subtle px-3 py-1.5 text-sm text-foreground">
                      {String(y).slice(2)}년생
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className={section}>
          <h2 className="font-serif text-xl text-accent-gold-soft">2027년 삼재띠</h2>
          <p className="text-base leading-relaxed text-foreground">
            2027년(정미년)은 돼지띠·토끼띠·양띠의 <strong>날삼재</strong>예요. 2025년 들삼재, 2026년 눌삼재에 이어 삼재가 끝나는 해로, 무리한 확장보다 정리와 마무리에 힘을 두면 좋은 해로 봐요.
          </p>
        </section>

        <p className="text-sm leading-relaxed text-foreground-muted">
          띠별 운세는 태어난 해의 글자 하나로 본 흐름이에요. 같은 띠라도 생일에 따라 2027년은 달라요. 재미와 참고용으로 봐 주세요.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
