import type { Metadata } from "next";
import { ExamLanding } from "@/components/saju/ExamLanding";
import { getVisibleReviews } from "@/lib/reviews";
import { EXAM_SEASONS, sanitizeCheerName } from "@/lib/exam/seasons";

const TITLE = "임용고시 합격운 흐름 | 사주랩";
const DESCRIPTION =
  "생년월일시로 알아보는 나의 임용시험 합격운 흐름. 합격 여부나 확률이 아니라, 1차 시험까지 나에게 맞는 마무리 방식과 주의할 점을 무료로 확인해보세요.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/exam-luck/imyong" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/exam-luck/imyong", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default async function ImyongLuckPage({ searchParams }: { searchParams: Promise<{ cheer?: string | string[] }> }) {
  const [{ cheer }, reviews] = await Promise.all([searchParams, getVisibleReviews()]);
  return <ExamLanding season={EXAM_SEASONS.imyong} cheerFrom={sanitizeCheerName(cheer)} reviews={reviews} />;
}
