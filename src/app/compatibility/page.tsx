import type { Metadata } from "next";
import { CompatibilityFlow } from "@/components/saju/CompatibilityFlow";
import { SiteFooter } from "@/components/saju/SiteFooter";

const TITLE = "궁합 보기 | 사주랩";
const DESCRIPTION = "생년월일로 알아보는 나와 상대방의 궁합. 전체 궁합 점수와 핵심 요약을 무료로 확인하세요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/compatibility" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/compatibility", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function CompatibilityPage() {
  return (
    <div className="bg-starfield flex flex-1 flex-col items-center bg-background px-5 py-14">
      <main className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <span className="text-xs font-medium tracking-[0.2em] text-accent-gold-soft">COMPATIBILITY</span>
        <h1 className="font-serif text-3xl leading-snug text-foreground">
          나와 그 사람의
          <br />
          궁합은 몇 점일까?
        </h1>
        <p className="max-w-xs text-sm leading-relaxed text-foreground-muted">
          두 사람의 생년월일로 오행 궁합을 무료로 확인하고, 성격·연애·대화 궁합까지 자세히 살펴보세요.
        </p>
      </main>

      <div className="mt-10 w-full max-w-md">
        <CompatibilityFlow />
      </div>

      <SiteFooter />
    </div>
  );
}
