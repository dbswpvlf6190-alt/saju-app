import { PersonaHome } from "@/components/saju/PersonaHome";
import { FaqSection } from "@/components/saju/FaqSection";
import { SiteFooter } from "@/components/saju/SiteFooter";
import { getVisibleReviews } from "@/lib/reviews";

// 후기 목록이 새로 등록돼도 반영되도록 60초 주기로 재생성한다(완전 동적으로 매번 DB를
// 치는 것보다 가볍고, 완전 정적보다는 훨씬 자주 갱신된다).
export const revalidate = 60;

export default async function Home() {
  const reviews = await getVisibleReviews();

  return (
    <div className="bg-starfield flex flex-1 flex-col items-center bg-background px-5 py-14">
      <PersonaHome reviews={reviews} />
      <FaqSection />
      <SiteFooter />
    </div>
  );
}
