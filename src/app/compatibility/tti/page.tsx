import type { Metadata } from "next";
import Link from "next/link";
import { DEFAULT_OG_IMAGE } from "@/lib/og/defaults";
import { SiteFooter } from "@/components/saju/SiteFooter";
import { TTI, TTI_PAIR_BY_SLUG, ttiPairSlug } from "@/lib/saju/ttiCompat";

const title = "띠별 궁합표 | 12띠 78가지 조합 - 사주랩";
const description =
  "쥐띠부터 돼지띠까지 12띠의 78가지 궁합을 합·충·형·파·해·원진으로 쉽게 정리했어요. 내 띠를 고르고 상대 띠를 눌러 보세요.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/compatibility/tti" },
  openGraph: { title, description, url: "/compatibility/tti", type: "website", images: [DEFAULT_OG_IMAGE] },
  twitter: { card: "summary_large_image", title, description, images: [DEFAULT_OG_IMAGE] },
};

export default function TtiIndexPage() {
  const section = "flex flex-col gap-3 rounded-2xl border border-border-subtle bg-background-card/70 p-4";
  return (
    <div className="bg-starfield flex flex-1 flex-col items-center bg-background px-5 py-12">
      <main className="flex w-full max-w-md flex-col gap-5">
        <nav aria-label="breadcrumb" className="text-xs text-foreground-muted">
          <Link href="/" className="underline underline-offset-4">사주랩</Link>
          {" › "}띠별 궁합
        </nav>

        <header className="flex flex-col items-center gap-2 text-center">
          <h1 className="font-serif text-2xl leading-snug text-foreground">띠별 궁합표</h1>
          <p className="text-sm text-foreground-muted">12띠 · 78가지 조합</p>
        </header>

        <p className="text-sm leading-relaxed text-foreground">
          띠 궁합은 두 사람이 태어난 해의 글자(지지)가 서로 끌어당기는지(합), 부딪히는지(충) 같은 관계를 보는 방법이에요.
          가볍게 참고하기 좋지만, 사주 여덟 글자 중 한 글자만 본 것이라 진짜 궁합은 두 사람의 생년월일로 함께 보는 게 좋아요.
        </p>

        <Link href="/compatibility" className="rounded-xl bg-cta px-4 py-3 text-center text-sm font-semibold text-cta-ink">
          💞 두 사람 생년월일로 진짜 궁합 무료로 보기
        </Link>

        {TTI.map((a) => (
          <section key={a.slug} className={section}>
            <h2 className="font-serif text-lg text-accent-gold-soft">
              {a.animal}띠 <span className="text-xs text-foreground-muted">({a.branchKor}·{a.keywords.join("·")})</span>
            </h2>
            <ul className="grid grid-cols-3 gap-2">
              {TTI.map((b) => {
                const slug = ttiPairSlug(a, b);
                const main = TTI_PAIR_BY_SLUG[slug].relations[0];
                return (
                  <li key={b.slug}>
                    <Link
                      href={`/compatibility/tti/${slug}`}
                      className="flex flex-col rounded-lg border border-border-subtle px-2 py-2 text-center text-xs text-foreground-muted hover:border-accent-gold hover:text-accent-gold-soft"
                    >
                      <span>{b.animal}띠</span>
                      <span className="text-[10px] opacity-70">{main ? main.kind : "무난"}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <p className="text-xs leading-relaxed text-foreground-muted">
          전통 명리학의 지지 관계를 쉽게 풀어 쓴 참고용 콘텐츠예요. 관계를 정하는 기준이 아니에요. 띠는 입춘(보통 2월 4일
          무렵)을 기준으로 바뀌어요.
        </p>

        <SiteFooter />
      </main>
    </div>
  );
}
