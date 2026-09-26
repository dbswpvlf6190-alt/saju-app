import { PersonaHome } from "@/components/saju/PersonaHome";
import { FaqSection } from "@/components/saju/FaqSection";
import { SiteFooter } from "@/components/saju/SiteFooter";
import { getVisibleReviews } from "@/lib/reviews";
import { EXAM_SEASONS, getSeasonStatus } from "@/lib/exam/seasons";

// 후기 목록이 새로 등록돼도 반영되도록 60초 주기로 재생성한다(완전 동적으로 매번 DB를
// 치는 것보다 가볍고, 완전 정적보다는 훨씬 자주 갱신된다).
export const revalidate = 60;

export default async function Home() {
  const reviews = await getVisibleReviews();
  // 시험 시즌 배너용 D-day. 60초마다 재생성되므로 날짜가 바뀌어도 금방 맞춰진다.
  const examBadges = (["suneung", "imyong"] as const).flatMap((kind) => {
    const status = getSeasonStatus(EXAM_SEASONS[kind], new Date());
    if (status.phase !== "active") return [];
    const next = status.events[0];
    return [
      {
        kind,
        href: `${EXAM_SEASONS[kind].path}?ref=home_banner`,
        label: kind === "suneung" ? "수능 합격운" : "임용 합격운",
        dday: next.kind === "today" ? "D-DAY" : `D-${next.daysLeft}`,
      },
    ];
  });

  return (
    <div className="bg-starfield flex flex-1 flex-col items-center bg-background px-5 py-14">
      <PersonaHome reviews={reviews} examBadges={examBadges} />
      <FaqSection />
      <SiteFooter />
    </div>
  );
}
