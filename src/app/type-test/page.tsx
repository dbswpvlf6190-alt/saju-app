import type { Metadata } from "next";
import Link from "next/link";
import { SajuFlow } from "@/components/saju/SajuFlow";
import { SiteFooter } from "@/components/saju/SiteFooter";
import { getVisibleReviews } from "@/lib/reviews";

const TITLE = "사주 심리테스트 | 사주랩";
const DESCRIPTION = "생년월일시 하나로 알아보는 나의 자연물 유형과 잘 맞는 상대. 30초 만에 무료로 확인해보세요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/type-test" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/type-test", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// 홈(`/`)과 계산 로직·상품·결제 동선은 완전히 동일하다 — 진입 화면의 톤과 첫 결과
// 카드(TypeRevealCard)만 캐주얼한 "심리테스트" 프레이밍으로 바꾼 별도 랜딩이다.
// 인스타그램처럼 정통 사주보다 가벼운 테스트 콘텐츠가 더 잘 퍼지는 채널에 연결하기 위함.
export const revalidate = 60;

export default async function TypeTestPage() {
  const reviews = await getVisibleReviews();

  return (
    <div className="bg-starfield flex flex-1 flex-col items-center bg-background px-5 py-14">
      <main className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <span className="text-xs font-medium tracking-[0.2em] text-accent-gold-soft">
          SAJU LAB · 심리테스트
        </span>
        <h1 className="font-serif text-3xl leading-snug text-foreground">
          나는 어떤
          <br />
          자연물 유형일까?
        </h1>
        <p className="max-w-xs text-sm leading-relaxed text-foreground-muted">
          생년월일시 하나로 나의 사주 유형과, 나랑 잘 맞는 유형·묘하게 긴장감 도는 유형까지
          30초 만에 무료로 확인해보세요.
        </p>

        <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
          <a
            href="#saju-form"
            className="rounded-xl bg-accent-gold px-4 py-3 text-center text-sm font-semibold text-[#1a1430]"
          >
            🧪 30초 유형 테스트 시작하기
          </a>
          <Link
            href="/"
            className="rounded-xl border border-border-subtle px-4 py-2.5 text-center text-sm font-medium text-foreground-muted transition-colors hover:border-accent-gold hover:text-accent-gold-soft"
          >
            🔮 정식 사주풀이로 바로 가기
          </Link>
        </div>
      </main>

      <div id="saju-form" className="mt-10 w-full max-w-md scroll-mt-10">
        <SajuFlow reviews={reviews} entryMode="typeTest" />
      </div>

      <SiteFooter />
    </div>
  );
}
