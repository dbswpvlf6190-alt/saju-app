import type { Metadata } from "next";
import { ExamLanding } from "@/components/saju/ExamLanding";
import { getVisibleReviews } from "@/lib/reviews";
import { examMetadata } from "@/lib/og/examMetadata";
import { EXAM_SEASONS, sanitizeCheerName } from "@/lib/exam/seasons";

const TITLE = "수능 합격운 흐름 | 사주랩";
const DESCRIPTION =
  "생년월일시로 알아보는 나의 수능 합격운 흐름. 숫자나 특정 대학이 아니라, 수능까지 나에게 맞는 마무리 방식과 주의할 점을 무료로 확인해보세요.";

type SearchParams = Promise<{ cheer?: string | string[] }>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  return examMetadata("suneung", { title: TITLE, description: DESCRIPTION }, (await searchParams).cheer);
}

// 응원 링크(?cheer=)와 날마다 바뀌는 D-day를 요청마다 그리기 때문에 정적 재생성 대신 요청 시 렌더링된다.
export default async function ExamLuckPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ cheer }, reviews] = await Promise.all([searchParams, getVisibleReviews()]);
  return <ExamLanding season={EXAM_SEASONS.suneung} cheerFrom={sanitizeCheerName(cheer)} reviews={reviews} />;
}
