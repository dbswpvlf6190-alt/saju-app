import Link from "next/link";
import { SajuFlow } from "@/components/saju/SajuFlow";
import { SiteFooter } from "@/components/saju/SiteFooter";
import { ReviewList } from "@/components/saju/ReviewList";
import { prisma } from "@/lib/db/prisma";

// 후기 목록이 새로 등록돼도 반영되도록 60초 주기로 재생성한다(완전 동적으로 매번 DB를
// 치는 것보다 가볍고, 완전 정적보다는 훨씬 자주 갱신된다).
export const revalidate = 60;

export default async function Home() {
  const reviews = await prisma.review.findMany({
    where: { visible: true },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, rating: true, content: true, productType: true, createdAt: true },
  });

  return (
    <div className="bg-starfield flex flex-1 flex-col items-center bg-background px-5 py-14">
      <main className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <span className="text-xs font-medium tracking-[0.2em] text-accent-gold-soft">
          SAJU LAB
        </span>
        <h1 className="font-serif text-3xl leading-snug text-foreground">
          생년월일시로 읽는
          <br />
          나의 사주팔자
        </h1>
        <p className="max-w-xs text-sm leading-relaxed text-foreground-muted">
          정확한 절기·음양력 계산으로 나의 사주를 무료로 확인하고, 성격부터 오행 균형까지
          한눈에 살펴보세요.
        </p>

        <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
          <a
            href="#saju-form"
            className="rounded-xl bg-accent-gold px-4 py-3 text-center text-sm font-semibold text-[#1a1430]"
          >
            🔮 무료 사주 시작하기
          </a>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/compatibility"
              className="rounded-xl border border-border-subtle px-4 py-2.5 text-center text-sm font-medium text-foreground-muted transition-colors hover:border-accent-gold hover:text-accent-gold-soft"
            >
              ❤️ 궁합 보기
            </Link>
            <a
              href="#saju-form"
              className="rounded-xl border border-border-subtle px-4 py-2.5 text-center text-sm font-medium text-foreground-muted transition-colors hover:border-accent-gold hover:text-accent-gold-soft"
            >
              🌙 오늘의 운세
            </a>
          </div>
        </div>
      </main>

      <div id="saju-form" className="mt-10 w-full max-w-md scroll-mt-10">
        <SajuFlow />
      </div>

      <section className="mt-4 flex w-full max-w-md flex-col gap-3">
        <h2 className="px-1 text-sm font-medium text-foreground-muted">이용 후기</h2>
        <ReviewList reviews={reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))} />
      </section>

      <SiteFooter />
    </div>
  );
}
