import type { Metadata } from "next";
import Link from "next/link";
import { SajuFlow } from "@/components/saju/SajuFlow";
import { SiteFooter } from "@/components/saju/SiteFooter";
import { getVisibleReviews } from "@/lib/reviews";

const TITLE = "합격운 흐름 | 사주랩";
const DESCRIPTION =
  "생년월일시로 알아보는 나의 합격운 흐름. 숫자나 특정 대학이 아니라, 지금 나에게 필요한 마음가짐과 준비 방향을 무료로 확인해보세요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/exam-luck" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/exam-luck", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

// 홈(`/`)과 계산 로직·상품·결제 동선은 완전히 동일하다 — 수험생·학부모 검색 트래픽에
// 맞춘 별도 랜딩일 뿐이다. 특정 대학명이나 합격 확률(%) 같은 확정적 수치는 절대 다루지
// 않는다(examLuck.ts 참고) — 강점·주의점을 함께 담은 정성적 흐름만 보여준다.
export const revalidate = 60;

export default async function ExamLuckPage() {
  const reviews = await getVisibleReviews();

  return (
    <div className="bg-starfield flex flex-1 flex-col items-center bg-background px-5 py-14">
      <main className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <span className="text-xs font-medium tracking-[0.2em] text-accent-gold-soft">
          SAJU LAB · 합격운
        </span>
        <h1 className="font-serif text-3xl leading-snug text-foreground">
          지금 나에게 필요한
          <br />
          합격운 흐름은?
        </h1>
        <p className="max-w-xs text-sm leading-relaxed text-foreground-muted">
          생년월일시 하나로 지금 나에게 필요한 마음가짐과 준비 방향을 무료로 확인해보세요.
          특정 대학이나 확률이 아니라, 강점과 주의할 점을 함께 짚어드려요.
        </p>

        <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
          <a
            href="#saju-form"
            className="rounded-xl bg-accent-gold px-4 py-3 text-center text-sm font-semibold text-[#1a1430]"
          >
            📚 합격운 흐름 확인하기
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
        <SajuFlow reviews={reviews} entryMode="examLuck" />
      </div>

      <SiteFooter />
    </div>
  );
}
