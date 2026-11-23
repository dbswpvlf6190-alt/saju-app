import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DEFAULT_OG_IMAGE } from "@/lib/og/defaults";
import { SiteFooter } from "@/components/saju/SiteFooter";
import { Y2027View } from "@/components/saju/Y2027View";
import {
  BIRTH_YEAR_MAX,
  BIRTH_YEAR_MIN,
  BIRTH_YEARS,
  TTI,
  Y2027,
  ageTips,
  birthYearInfo,
  birthYearsOf,
  isSamjae2027,
  monthFlows,
  stemNote,
  ttiFromKey,
  yearRelationLabel,
  yearTheme,
} from "@/lib/saju/year2027";
import type { Tti } from "@/lib/saju/ttiCompat";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://saju-app-three-dusky.vercel.app";

export const dynamicParams = false;

export function generateStaticParams() {
  return [...TTI.map((t) => ({ key: t.slug })), ...BIRTH_YEARS.map((y) => ({ key: String(y) }))];
}

type Resolved =
  | { kind: "tti"; tti: Tti }
  | { kind: "year"; tti: Tti; info: ReturnType<typeof birthYearInfo> };

function resolve(key: string): Resolved | null {
  const tti = ttiFromKey(key);
  if (tti) return { kind: "tti", tti };
  if (/^\d{4}$/.test(key)) {
    const y = Number(key);
    if (y >= BIRTH_YEAR_MIN && y <= BIRTH_YEAR_MAX) {
      const info = birthYearInfo(y);
      return { kind: "year", tti: info.tti, info };
    }
  }
  return null;
}

function shortYear(y: number) {
  return String(y).slice(2);
}

function pageName(r: Resolved): string {
  return r.kind === "tti"
    ? `${r.tti.animal}띠 2027년 운세`
    : `${shortYear(r.info.year)}년생 ${r.tti.animal}띠 2027년 운세`;
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  const r = resolve(key);
  if (!r) return {};
  const theme = yearTheme(r.tti);
  const title =
    r.kind === "tti"
      ? `${r.tti.animal}띠 2027년 운세 | 정미년 ${theme.headline} - 사주랩`
      : `${r.info.year}년생 ${shortYear(r.info.year)}년생 ${r.tti.animal}띠 2027년 운세 | 좋은 달·조심할 달 - 사주랩`;
  const description =
    r.kind === "tti"
      ? `2027년 정미년(양띠 해) ${r.tti.animal}띠 운세. ${theme.summary.slice(0, 70)}… 띠 관계와 삼재, 좋은 달이 몇 번인지 정리했어요. 내 좋은 달은 생일로 확인해요.`
      : `${r.info.year}년생(${r.info.ganzhiKor}생, 2027년 만 ${r.info.age2027}세) ${r.tti.animal}띠의 2027년 정미년 운세. 띠 관계, 태어난 해 천간으로 본 흐름, 삼재, ${ageTips(r.info.age2027).stage} 생활 조언을 쉽게 정리했어요. 내 좋은 달은 생일로 확인해요.`;
  const url = `/2027/${key}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "article", images: [DEFAULT_OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [DEFAULT_OG_IMAGE] },
  };
}

export default async function Year2027Page({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const r = resolve(key);
  if (!r) notFound();

  const t = r.tti;
  const theme = yearTheme(t);
  const months = monthFlows(t.branch);
  const good = months.filter((m) => m.tone === "good");
  const care = months.filter((m) => m.tone === "care");
  const samjae = isSamjae2027(t.branch);
  const name = pageName(r);
  const years = birthYearsOf(t);
  const stem = r.kind === "year" ? stemNote(r.info.stem) : null;
  const age = r.kind === "year" ? ageTips(r.info.age2027) : null;
  const cta = `/new-year?ref=y2027_${key}${r.kind === "year" ? `&y=${r.info.year}` : ""}`;
  // 버튼 문구를 그 페이지 손님에 맞춘다(2026-11-21 C2): "생일 넣고 내 2027년 운세 보기" → "75년생, 내 생일로 좋은 날짜 보기"
  const who = r.kind === "year" ? `${shortYear(r.info.year)}년생` : `${t.animal}띠`;

  const section = "flex flex-col gap-2.5 rounded-2xl border border-border-subtle bg-background-card/70 p-5";
  const h2 = "font-serif text-xl text-accent-gold-soft";
  const body = "text-base leading-relaxed text-foreground";

  const faqs = [
    {
      question: `${name}, 한 줄로 정리하면요?`,
      answer: theme.summary,
    },
    {
      question: `2027년에 ${t.animal}띠가 좋은 달과 조심할 달은 언제인가요?`,
      answer: `띠로 보면 좋은 달은 ${good.length}번, 조심할 달은 ${care.length}번 있어요. 다만 띠는 사주 여덟 글자 중 한 글자라, 같은 ${t.animal}띠라도 태어난 달·날·시간에 따라 좋은 달이 달라져요. 생일을 넣으면 내 사주로 어느 달인지 알려 드려요.`,
    },
    {
      question: `${t.animal}띠는 2027년에 삼재인가요?`,
      answer: samjae
        ? `네. 돼지·토끼·양띠는 2025년부터 3년 동안 삼재이고, 2027년은 삼재가 끝나는 '날삼재'예요. 삼재를 지나치게 걱정하기보다 정리와 마무리에 힘을 두는 해로 보면 좋아요.`
        : `아니에요. 2027년(정미년) 삼재는 돼지·토끼·양띠의 날삼재예요. ${t.animal}띠는 삼재에 해당하지 않아요.`,
    },
    {
      question: "1월이나 2월 초에 태어났는데, 띠가 맞나요?",
      answer: `사주에서는 해가 1월 1일이 아니라 입춘(보통 2월 4일 무렵)에 바뀌어요. 입춘 전에 태어났다면 전년도 띠일 수 있어요. 생년월일을 넣으면 정확한 띠와 사주로 2027년을 볼 수 있어요.`,
    },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: `${name} — ${theme.headline}`,
      description: theme.summary,
      inLanguage: "ko-KR",
      mainEntityOfPage: `${SITE_URL}/2027/${key}`,
      author: { "@type": "Organization", name: "사주랩" },
      publisher: { "@type": "Organization", name: "사주랩" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "사주랩", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "2027 띠별 운세", item: `${SITE_URL}/2027` },
        ...(r.kind === "year"
          ? [
              { "@type": "ListItem", position: 3, name: `${t.animal}띠 2027년 운세`, item: `${SITE_URL}/2027/${t.slug}` },
              { "@type": "ListItem", position: 4, name, item: `${SITE_URL}/2027/${key}` },
            ]
          : [{ "@type": "ListItem", position: 3, name, item: `${SITE_URL}/2027/${key}` }]),
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
    },
  ];

  return (
    <div className="bg-starfield flex flex-1 flex-col items-center bg-background px-5 py-12">
      <Y2027View page={key} />
      <main className="flex w-full max-w-md flex-col gap-5">
        <nav aria-label="breadcrumb" className="text-sm text-foreground-muted">
          <Link href="/" className="underline underline-offset-4">사주랩</Link>
          {" › "}
          <Link href="/2027" className="underline underline-offset-4">2027 띠별 운세</Link>
          {r.kind === "year" && (
            <>
              {" › "}
              <Link href={`/2027/${t.slug}`} className="underline underline-offset-4">{t.animal}띠</Link>
            </>
          )}
        </nav>

        <header className="flex flex-col items-center gap-2 text-center">
          <span className="text-sm font-medium tracking-[0.15em] text-accent-gold-soft">
            2027 정미년(丁未年) · {Y2027.color} 양의 해
          </span>
          <h1 className="font-serif text-[1.7rem] leading-snug text-foreground">
            {r.kind === "year" ? (
              <>
                {r.info.year}년생 {t.animal}띠
                <br />
                2027년 운세
              </>
            ) : (
              <>
                {t.animal}띠 2027년 운세
              </>
            )}
          </h1>
          {r.kind === "year" && (
            <p className="text-base text-foreground-muted">
              {r.info.ganzhiKor}생({r.info.ganzhiHanja}) · {r.info.colorName} {t.animal}띠 · 2027년 만 {r.info.age2027}세
            </p>
          )}
          <p className="font-serif text-lg text-accent-gold-soft">“{theme.headline}”</p>
        </header>

        <section className="flex flex-col gap-2 rounded-2xl border border-accent-gold/50 bg-accent-gold/10 p-5">
          <h2 className="font-serif text-lg text-foreground">한눈에 보기</h2>
          <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-2 text-base">
            <dt className="text-foreground-muted">띠 관계</dt>
            <dd className="text-foreground">{yearRelationLabel(t)}</dd>
            <dt className="text-foreground-muted">삼재</dt>
            <dd className="text-foreground">{samjae ? "날삼재(삼재가 끝나는 해)" : "해당 없음"}</dd>
            <dt className="text-foreground-muted">좋은 달</dt>
            <dd className="text-foreground">{good.length ? `${good.length}번 · 생일로 보면 내 달이 나와요` : "고른 편"}</dd>
            <dt className="text-foreground-muted">조심할 달</dt>
            <dd className="text-foreground">{care.length ? `${care.length}번 · 생일로 보면 내 달이 나와요` : "고른 편"}</dd>
          </dl>
        </section>

        <p className={body}>{theme.summary}</p>

        <Link href={cta} className="rounded-2xl bg-cta px-4 py-4 text-center text-lg font-bold text-cta-ink">
          {who}, 내 생일로 좋은 날짜 보기
        </Link>
        <p className="-mt-3 text-center text-sm text-foreground-muted">
          무료 · 1분 · {r.kind === "year" ? "태어난 해는 채워 둘게요" : "띠는 여덟 글자 중 한 글자, 생일로 보면 내 날짜가 나와요"}
        </p>

        <section className={section}>
          <h2 className={h2}>{t.animal}띠와 2027년의 만남</h2>
          {theme.body.map((p) => (
            <p key={p} className={body}>{p}</p>
          ))}
        </section>

        {stem && r.kind === "year" && (
          <section className={section}>
            <h2 className={h2}>
              {r.info.stemKor}({r.info.stem})년생으로 보면 — {stem.title}
            </h2>
            <p className={body}>{stem.body}</p>
          </section>
        )}

        <section className={section}>
          <h2 className={h2}>2027년 열두 달</h2>
          {/* 2026-11-23: 띠 달별 풀이를 다 보여 주면 "음, 알겠다" 하고 끝난다 — 몇 번인지만 알리고 어느 달인지는 생일로 연다. */}
          <div className="grid grid-cols-4 gap-1.5" role="img" aria-label="열두 달이 모두 잠겨 있어요">
            {months.map((m) => (
              <span key={m.month} className="flex flex-col items-center rounded-lg border border-dashed border-border-subtle bg-background-card py-2 text-foreground-muted">
                <small className="text-[11px]">{m.animal}의 달</small>
                <b className="text-base font-normal">{m.month}월 🔒</b>
              </span>
            ))}
          </div>
          <p className={body}>
            {t.animal}띠로 보면 2027년에 좋은 달이 {good.length}번, 조심할 달이 {care.length}번 있어요. 같은 {t.animal}띠라도 태어난 달·날·시간에 따라 어느 달이 좋은지는 달라져요.
          </p>
          {/* 달별 흐름을 다 읽은 순간이 '내 날짜'가 가장 궁금한 때 — 여기서 바로 넘어가게 버튼을 하나 더 둔다(C2). */}
          <Link href={cta} className="mt-1 rounded-xl border border-accent-gold/60 bg-accent-gold/10 px-4 py-3 text-center text-base font-semibold text-foreground">
            {who}, 내 생일로 좋은 달 열어 보기 →
          </Link>
        </section>

        {age && (
          <section className={section}>
            <h2 className={h2}>{age.stage}에게 2027년 생활 조언</h2>
            <ul className="flex list-disc flex-col gap-1.5 pl-5">
              {age.tips.map((tip) => (
                <li key={tip} className={body}>{tip}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex flex-col items-center gap-3 rounded-2xl border border-accent-gold/50 bg-background-elevated p-5 text-center">
          <strong className="font-serif text-lg text-foreground">내 사주로 보는 2027년이 궁금하다면</strong>
          <p className="text-base leading-relaxed text-foreground-muted">
            같은 {t.animal}띠라도 태어난 달·날·시간에 따라 2027년은 달라요. 생일을 넣으면 내 일주를 먼저 무료로 보여 드리고, 원하면 월별 12개월 신년운세를 열어 볼 수 있어요.
          </p>
          <Link href={cta} className="w-full rounded-2xl bg-cta px-4 py-4 text-lg font-bold text-cta-ink">
            무료로 내 사주 먼저 보기
          </Link>
        </section>

        <section className={section}>
          <h2 className={h2}>자주 묻는 질문</h2>
          {faqs.map((f) => (
            <div key={f.question} className="flex flex-col gap-1">
              <strong className="text-base text-foreground">Q. {f.question}</strong>
              <p className="text-base leading-relaxed text-foreground-muted">{f.answer}</p>
            </div>
          ))}
        </section>

        <section className={section}>
          <h2 className={h2}>{t.animal}띠 나이별 2027년 운세</h2>
          <ul className="flex flex-wrap gap-2">
            {years.map((y) => (
              <li key={y}>
                <Link
                  href={`/2027/${y}`}
                  className={`inline-block rounded-full border px-3 py-1.5 text-sm ${
                    r.kind === "year" && r.info.year === y ? "border-accent-gold bg-accent-gold/10 text-accent-gold-soft" : "border-border-subtle text-foreground"
                  }`}
                >
                  {shortYear(y)}년생({Y2027.year - y}세)
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className={section}>
          <h2 className={h2}>다른 띠 2027년 운세</h2>
          <ul className="grid grid-cols-3 gap-2">
            {TTI.map((x) => (
              <li key={x.slug}>
                <Link
                  href={`/2027/${x.slug}`}
                  className={`block rounded-xl border px-2 py-2 text-center text-sm ${x === t ? "border-accent-gold text-accent-gold-soft" : "border-border-subtle text-foreground"}`}
                >
                  {x.animal}띠
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-sm leading-relaxed text-foreground-muted">
          이 풀이는 한국 전통 사주 명리학의 띠(태어난 해의 지지)와 천간 관계를 바탕으로 정리했어요. 재미와 참고용으로 봐 주시고, 중요한 결정은 스스로의 판단을 먼저 믿어 주세요.
        </p>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteFooter />
    </div>
  );
}
