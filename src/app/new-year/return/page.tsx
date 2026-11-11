import type { Metadata } from "next";
import { NewYearReturn } from "@/components/saju/NewYearReturn";
import { SiteFooter } from "@/components/saju/SiteFooter";

export const metadata: Metadata = {
  title: "신년운세 결제 확인 | 사주랩",
  robots: { index: false, follow: false },
};

// 모바일 결제창이 끝나고 돌아오는 화면. 결제 확인(complete)은 최대 1분 걸릴 수 있어 서버가 아니라 브라우저에서 처리한다.
export default function NewYearReturnPage() {
  return (
    <div className="bg-starfield flex flex-1 flex-col items-center bg-background px-5 py-14">
      <NewYearReturn />
      <SiteFooter />
    </div>
  );
}
