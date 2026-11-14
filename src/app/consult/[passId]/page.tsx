import type { Metadata } from "next";
import { ConsultChat } from "@/components/consult/ConsultChat";

export const metadata: Metadata = {
  title: "내 AI 사주 상담방 | 사주랩",
  robots: { index: false, follow: false },
  // 주소에 상담권 토큰이 들어 있어 다른 사이트로 넘어갈 때 주소가 새지 않게 한다.
  referrer: "same-origin",
};

type Params = Promise<{ passId: string }>;
type SearchParams = Promise<{ k?: string; new?: string }>;

/** 상담방. 링크 토큰(k)은 화면에서 API로만 넘기고, 검색엔진에는 노출하지 않는다. */
export default async function ConsultRoomPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ passId }, { k, new: isNew }] = await Promise.all([params, searchParams]);
  return <ConsultChat passId={passId} token={k ?? ""} justPaid={isNew === "1"} />;
}
