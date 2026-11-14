import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DEFAULT_OG_IMAGE } from "@/lib/og/defaults";
import { SiteFooter } from "@/components/saju/SiteFooter";
import { TTI, TTI_PAIRS, TTI_PAIR_BY_SLUG, ttiPairSlug } from "@/lib/saju/ttiCompat";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://saju-app-three-dusky.vercel.app";

export const dynamicParams = false;

export function generateStaticParams() {
  return TTI_PAIRS.map((p) => ({ pair: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ pair: string }> }): Promise<Metadata> {
  const { pair } = await params;
  const p = TTI_PAIR_BY_SLUG[pair];
  if (!p) return {};
  const tags = p.relations.map((r) => r.kind).join("·");
  const title = `${p.a.animal}띠 ${p.b.animal}띠 궁합${tags ? ` | ${tags}` : ""} - 사주랩`;
  const description = `${p.summary} ${p.a.animal}띠와 ${p.b.animal}띠의 합·충 관계, 오행으로 본 관계, 잘 맞는 점과 부딪힐 때 팁을 쉽게 정리했어요.`;
  return {
    title,
    description,
    alternates: { canonical: `/compatibility/tti/${p.slug}` },
    openGraph: { title, description, url: `/compatibility/tti/${p.slug}`, type: "article", images: [DEFAULT_OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [DEFAULT_OG_IMAGE] },
  };
}

export default async function TtiPairPage({ params }: { params: Promise<{ pair: string }> }) {
  const { pair } = await params;
  const p = TTI_PAIR_BY_SLUG[pair];
  if (!p) notFound();

  const name = `${p.a.animal}띠 ${p.b.animal}띠`;
  const others = TTI.filter((t) => t !== p.b).map((t) => ({ t, slug: ttiPairSlug(p.a, t) }));

  const faqs = [
    { question: `${name} 궁합은 좋은 편인가요?`, answer: p.summary },
    {
      question: "띠 궁합만 보면 정확한가요?",
      answer:
        "띠는 태어난 해의 글자 하나만 본 거예요. 사주는 해·달·날·시간의 여덟 글자로 이뤄지고, 궁합에서는 특히 태어난 날의 글자(일간·일지)를 중요하게 봐요. 띠 궁합은 가볍게 참고하고, 두 사람의 생년월일로 사주 전체 궁합을 함께 보는 걸 추천해요.",
    },
    {
      question: "띠는 1월 1일이 아니라 입춘부터 바뀐다던데요?",
      answer:
        "맞아요. 사주에서는 해가 입춘(보통 2월 4일 무렵)에 바뀌어요. 1월이나 2월 초에 태어났다면 전년도 띠일 수 있으니, 생년월일을 넣어 정확한 띠를 확인해 보세요.",
    },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: p.headline,
      description: p.summary,
      inLanguage: "ko-KR",
      mainEntityOfPage: `${SITE_URL}/compatibility/tti/${p.slug}`,
      author: { "@type": "Organization", name: "사주랩" },
      publisher: { "@type": "Organization", name: "사주랩" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "사주랩", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "띠별 궁합", item: `${SITE_URL}/compatibility/tti` },
        { "@type": "ListItem", position: 3, name: `${name} 궁합`, item: `${SITE_URL}/compatibility/tti/${p.slug}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
    },
  ];

  const section = "flex flex-col gap-2 rounded-2xl border border-border-subtle bg-background-card/70 p-4";
  const h2 = "font-serif text-lg text-accent-gold-soft";
  const body = "text-sm leading-relaxed text-foreground";
  const toneClass = { good: "border-accent-gold/50 text-accent-gold-soft", neutral: "border-border-subtle text-foreground-muted", care: "border-red-300/40 text-red-700" };

  return (
    <div className="bg-starfield flex flex-1 flex-col items-center bg-background px-5 py-12">
      <main className="flex w-full max-w-md flex-col gap-5">
        <nav aria-label="breadcrumb" className="text-xs text-foreground-muted">
          <Link href="/" className="underline underline-offset-4">사주랩</Link>
          {" › "}
          <Link href="/compatibility/tti" className="underline underline-offset-4">띠별 궁합</Link>
          {" › "}
          {name}
        </nav>

        <header className="flex flex-col items-center gap-2 text-center">
          <span className="text-xs font-medium tracking-[0.2em] text-accent-gold-soft">
            {p.a.branchKor}({p.a.branch}) · {p.b.branchKor}({p.b.branch})
          </span>
          <h1 className="font-serif text-2xl leading-snug text-foreground">{name} 궁합</h1>
          <ul className="mt-1 flex flex-wrap justify-center gap-1.5">
            {p.relations.length ? (
              p.relations.map((r) => (
                <li key={r.kind} className={`rounded-full border px-3 py-1 text-xs ${toneClass[r.tone]}`}>
                  {r.kind}({r.hanja})
                </li>
              ))
            ) : (
              <li className="rounded-full border border-border-subtle px-3 py-1 text-xs text-foreground-muted">합·충 없음</li>
            )}
          </ul>
        </header>

        <p className={body}>{p.summary}</p>

        <Link href="/compatibility" className="rounded-xl bg-cta px-4 py-3 text-center text-sm font-semibold text-cta-ink">
          💞 두 사람 생년월일로 진짜 궁합 무료로 보기
        </Link>

        {p.relations.map((r) => (
          <section key={r.kind} className={section}>
            <h2 className={h2}>{r.title}</h2>
            <p className={body}>{r.body}</p>
          </section>
        ))}

        <section className={section}>
          <h2 className={h2}>오행으로 본 두 띠</h2>
          <p className={body}>{p.elementNote}</p>
        </section>

        <section className={section}>
          <h2 className={h2}>두 띠의 성향</h2>
          {[p.a, p.b].filter((t, i, arr) => arr.indexOf(t) === i).map((t) => (
            <p key={t.slug} className={body}>
              <strong className="text-foreground">{t.animal}띠</strong> ({t.keywords.join("·")}) — {t.nature}
            </p>
          ))}
        </section>

        <section className={section}>
          <h2 className={h2}>잘 맞는 점</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            {p.strengths.map((s) => <li key={s} className={body}>{s}</li>)}
          </ul>
        </section>

        <section className={section}>
          <h2 className={h2}>부딪힐 때 이렇게 해 보세요</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            {p.tips.map((s) => <li key={s} className={body}>{s}</li>)}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className={h2}>자주 묻는 질문</h2>
          {faqs.map((f) => (
            <details key={f.question} className="rounded-xl border border-border-subtle px-4 py-3 open:border-accent-gold/40">
              <summary className="cursor-pointer text-sm font-medium text-foreground">{f.question}</summary>
              <p className="mt-2 text-sm leading-relaxed text-foreground-muted">{f.answer}</p>
            </details>
          ))}
        </section>

        <section className={section}>
          <h2 className={h2}>{p.a.animal}띠와 다른 띠의 궁합</h2>
          <ul className="grid grid-cols-3 gap-2">
            {others.map(({ t, slug }) => (
              <li key={slug}>
                <Link href={`/compatibility/tti/${slug}`} className="block rounded-lg border border-border-subtle px-2 py-2 text-center text-xs text-foreground-muted hover:border-accent-gold hover:text-accent-gold-soft">
                  {p.a.animal}띠 · {t.animal}띠
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-xs leading-relaxed text-foreground-muted">
          전통 명리학의 지지 관계(합·충·형·파·해·원진)를 쉽게 풀어 쓴 참고용 콘텐츠예요. 띠는 태어난 해의 한 글자만 본
          것이라, 관계를 정하는 기준이 아니라 서로를 이해하는 참고로만 봐 주세요.
        </p>

        <Link href="/compatibility/tti" className="rounded-xl border border-border-subtle px-4 py-2.5 text-center text-sm text-foreground-muted hover:border-accent-gold hover:text-accent-gold-soft">
          띠별 궁합 전체 보기
        </Link>

        <SiteFooter />
      </main>

      {jsonLd.map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          // 고정된 콘텐츠 데이터에서만 만들어지지만, </script>로 조기 종료되지 않도록 "<"를 이스케이프한다.
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
        />
      ))}
    </div>
  );
}
