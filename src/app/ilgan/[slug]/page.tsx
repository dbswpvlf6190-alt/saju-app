import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/og/defaults";
import Link from "next/link";
import { notFound } from "next/navigation";
import { WuxingMascot } from "@/components/saju/WuxingMascot";
import { SiteFooter } from "@/components/saju/SiteFooter";
import { ILGAN_BY_SLUG, ILGAN_PAGES } from "@/lib/saju/ilganPages";
import { getTypeProfile } from "@/lib/saju/typeProfile";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://saju-app-three-dusky.vercel.app";

export const dynamicParams = false;

export function generateStaticParams() {
  return ILGAN_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = ILGAN_BY_SLUG[slug];
  if (!page) return {};
  const typeName = getTypeProfile(page.gan).typeName;
  const title = `${page.hangul}(${page.hanja}) 일간 성격·연애·직업 | ${typeName} - 사주랩`;
  const description = `${page.hangul} 일간은 ${page.metaphor}에 비유돼요. ${page.keywords.join("·")} 중심의 성격, 강점과 주의점, 연애·직업·재물·인간관계 특징을 쉽게 정리했어요.`;
  return {
    title,
    description,
    alternates: { canonical: `/ilgan/${page.slug}` },
    openGraph: { title, description, url: `/ilgan/${page.slug}`, type: "article", images: [DEFAULT_OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [DEFAULT_OG_IMAGE] },
  };
}

export default async function IlganDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = ILGAN_BY_SLUG[slug];
  if (!page) notFound();

  const profile = getTypeProfile(page.gan);
  const index = ILGAN_PAGES.findIndex((p) => p.slug === page.slug);
  const prev = ILGAN_PAGES[(index + ILGAN_PAGES.length - 1) % ILGAN_PAGES.length];
  const next = ILGAN_PAGES[(index + 1) % ILGAN_PAGES.length];

  const faqs = [
    {
      question: `${page.hangul} 일간은 어떤 성격인가요?`,
      answer: page.summary,
    },
    {
      question: `${page.hangul} 일간과 잘 맞는 유형은 무엇인가요?`,
      answer: `${profile.synergyNote} ${profile.tensionNote} 다만 궁합은 두 사람의 사주 전체를 함께 봐야 하고, 관계를 결정하는 절대 기준이 아니라 서로를 이해하는 참고 자료예요.`,
    },
    {
      question: "내 일간은 어떻게 알 수 있나요?",
      answer:
        "일간은 태어난 날의 천간(하늘의 글자)이에요. 생년월일을 입력하면 사주랩이 태어난 날을 기준으로 계산해서 무료로 알려드려요. 태어난 시간을 몰라도 일간은 확인할 수 있어요.",
    },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: `${page.hangul}(${page.hanja}) 일간 성격·연애·직업 | ${profile.typeName}`,
      description: page.summary,
      inLanguage: "ko-KR",
      mainEntityOfPage: `${SITE_URL}/ilgan/${page.slug}`,
      author: { "@type": "Organization", name: "사주랩" },
      publisher: { "@type": "Organization", name: "사주랩" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "사주랩", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "일간별 성격", item: `${SITE_URL}/ilgan` },
        { "@type": "ListItem", position: 3, name: `${page.hangul} 일간`, item: `${SITE_URL}/ilgan/${page.slug}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
  ];

  const section = "flex flex-col gap-2 rounded-2xl border border-border-subtle bg-background-card/70 p-4";
  const h2 = "font-serif text-lg text-accent-gold-soft";
  const body = "text-sm leading-relaxed text-foreground";

  return (
    <div className="bg-starfield flex flex-1 flex-col items-center bg-background px-5 py-12">
      <main className="flex w-full max-w-md flex-col gap-5">
        <nav aria-label="breadcrumb" className="text-xs text-foreground-muted">
          <Link href="/" className="underline underline-offset-4">사주랩</Link>
          {" › "}
          <Link href="/ilgan" className="underline underline-offset-4">일간별 성격</Link>
          {" › "}
          {page.hangul} 일간
        </nav>

        <header className="flex flex-col items-center gap-2 text-center">
          <WuxingMascot wuxing={page.wuxing} size={96} />
          <span className="text-xs font-medium tracking-[0.2em] text-accent-gold-soft">
            {profile.typeName} · {page.yinYang} {page.wuxing} 기운
          </span>
          <h1 className="font-serif text-2xl leading-snug text-foreground">
            {page.hangul}({page.hanja}) 일간 성격·연애·직업
          </h1>
          <p className="text-sm text-foreground-muted">{page.metaphor}</p>
          <ul className="mt-1 flex flex-wrap justify-center gap-1.5">
            {page.keywords.map((k) => (
              <li key={k} className="rounded-full border border-border-subtle px-3 py-1 text-xs text-foreground-muted">
                #{k}
              </li>
            ))}
          </ul>
        </header>

        <p className={body}>{page.summary}</p>

        <Link
          href="/type-test"
          className="rounded-xl bg-accent-gold px-4 py-3 text-center text-sm font-semibold text-[#1a1430]"
        >
          🧪 내 일간이 뭔지 30초 무료로 확인하기
        </Link>

        <section className={section}>
          <h2 className={h2}>일간이란?</h2>
          <p className={body}>
            사주는 태어난 해·달·날·시간의 네 기둥으로 이뤄지는데, 그중 <strong>태어난 날의 천간(하늘의 글자)</strong>을
            일간이라고 해요. 사주에서 &quot;나 자신&quot;을 상징하는 글자로 보기 때문에 성향을 이야기할 때 가장 먼저 봐요.
            일간은 갑·을·병·정·무·기·경·신·임·계 10가지이고, 이 페이지는 그중 {page.hangul}({page.hanja}) 일간이에요.
          </p>
        </section>

        <section className={section}>
          <h2 className={h2}>{page.hangul} 일간의 강점</h2>
          <ul className="flex flex-col gap-3">
            {page.strengths.map((s) => (
              <li key={s.title} className={body}>
                <strong className="text-foreground">{s.title}</strong> — {s.body}
              </li>
            ))}
          </ul>
        </section>

        <section className={section}>
          <h2 className={h2}>이런 점은 조심하면 좋아요</h2>
          <ul className="flex flex-col gap-3">
            {page.cautions.map((c) => (
              <li key={c.title} className={body}>
                <strong className="text-foreground">{c.title}</strong> — {c.body}
              </li>
            ))}
          </ul>
        </section>

        <section className={section}>
          <h2 className={h2}>연애 스타일</h2>
          <p className={body}>{page.love}</p>
        </section>

        <section className={section}>
          <h2 className={h2}>일과 직업</h2>
          <p className={body}>{page.work}</p>
        </section>

        <section className={section}>
          <h2 className={h2}>돈을 다루는 방식</h2>
          <p className={body}>{page.money}</p>
        </section>

        <section className={section}>
          <h2 className={h2}>인간관계</h2>
          <p className={body}>{page.relations}</p>
        </section>

        <section className={section}>
          <h2 className={h2}>잘 맞는 유형과 긴장감 도는 유형</h2>
          <p className={body}>{profile.synergyNote}</p>
          <p className={body}>{profile.tensionNote}</p>
          <p className="text-xs text-foreground-muted">
            오행의 상생·상극을 바탕으로 한 일반적인 경향이에요. 실제 궁합은 두 사람의 사주 전체를 함께 봐야 해요.
          </p>
          <Link href="/compatibility" className="text-sm text-accent-gold-soft underline underline-offset-4">
            우리 둘의 궁합 보러 가기 →
          </Link>
        </section>

        <section className={section}>
          <h2 className={h2}>오늘부터 해볼 수 있는 실천 팁</h2>
          <ol className="flex list-decimal flex-col gap-2 pl-5">
            {page.tips.map((t) => (
              <li key={t} className={body}>{t}</li>
            ))}
          </ol>
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

        <p className="text-xs leading-relaxed text-foreground-muted">
          이 내용은 전통 명리학의 해석을 쉽게 풀어 쓴 참고용 콘텐츠예요. 같은 일간이라도 사주 전체의 구성에 따라
          해석은 달라질 수 있고, 성격이나 미래를 단정하는 것이 아니에요.
        </p>

        <div className="flex justify-between gap-3 text-sm">
          <Link href={`/ilgan/${prev.slug}`} className="text-foreground-muted underline underline-offset-4">
            ← {prev.hangul} 일간
          </Link>
          <Link href={`/ilgan/${next.slug}`} className="text-foreground-muted underline underline-offset-4">
            {next.hangul} 일간 →
          </Link>
        </div>

        <Link
          href="/ilgan"
          className="rounded-xl border border-border-subtle px-4 py-2.5 text-center text-sm text-foreground-muted hover:border-accent-gold hover:text-accent-gold-soft"
        >
          10가지 일간 전체 보기
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
