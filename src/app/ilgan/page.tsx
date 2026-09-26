import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/og/defaults";
import Link from "next/link";
import { WuxingMascot } from "@/components/saju/WuxingMascot";
import { SiteFooter } from "@/components/saju/SiteFooter";
import { ILGAN_PAGES } from "@/lib/saju/ilganPages";
import { getTypeProfile } from "@/lib/saju/typeProfile";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://saju-app-three-dusky.vercel.app";
const TITLE = "일간별 성격 10가지 (갑목~계수) 한눈에 보기 - 사주랩";
const DESCRIPTION =
  "사주에서 나를 상징하는 일간 10가지(갑목·을목·병화·정화·무토·기토·경금·신금·임수·계수)의 성격, 연애, 직업, 인간관계 특징을 쉽게 정리했어요. 내 일간은 30초 무료 테스트로 확인해 보세요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/ilgan" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/ilgan", type: "website", images: [DEFAULT_OG_IMAGE] },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
};

export default function IlganIndexPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "일간별 성격 10가지",
    itemListElement: ILGAN_PAGES.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${p.hangul}(${p.hanja}) 일간`,
      url: `${SITE_URL}/ilgan/${p.slug}`,
    })),
  };

  return (
    <div className="bg-starfield flex flex-1 flex-col items-center bg-background px-5 py-12">
      <main className="flex w-full max-w-md flex-col gap-5">
        <header className="flex flex-col items-center gap-2 text-center">
          <span className="text-xs font-medium tracking-[0.2em] text-accent-gold-soft">SAJU LAB</span>
          <h1 className="font-serif text-2xl leading-snug text-foreground">일간별 성격 10가지</h1>
          <p className="text-sm leading-relaxed text-foreground-muted">
            일간은 태어난 날의 천간으로, 사주에서 &quot;나 자신&quot;을 상징하는 글자예요. 10가지 일간을 자연물에
            비유해서 성격과 연애, 일, 관계의 특징을 쉽게 풀었어요.
          </p>
        </header>

        <Link
          href="/type-test"
          className="rounded-xl bg-accent-gold px-4 py-3 text-center text-sm font-semibold text-[#1a1430]"
        >
          🧪 내 일간이 뭔지 30초 무료로 확인하기
        </Link>

        <ul className="flex flex-col gap-3">
          {ILGAN_PAGES.map((p) => {
            const typeName = getTypeProfile(p.gan).typeName;
            return (
              <li key={p.slug}>
                <Link
                  href={`/ilgan/${p.slug}`}
                  className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-background-card/70 p-3 transition-colors hover:border-accent-gold"
                >
                  <WuxingMascot wuxing={p.wuxing} size={56} />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-serif text-base text-accent-gold-soft">
                      {p.hangul}({p.hanja}) · {typeName}
                    </span>
                    <span className="text-xs text-foreground-muted">{p.metaphor}</span>
                    <span className="text-xs text-foreground-muted">{p.keywords.map((k) => `#${k}`).join(" ")}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="text-xs leading-relaxed text-foreground-muted">
          전통 명리학의 해석을 쉽게 풀어 쓴 참고용 콘텐츠예요. 같은 일간이라도 사주 전체의 구성에 따라 해석은
          달라질 수 있어요.
        </p>

        <SiteFooter />
      </main>

      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}
