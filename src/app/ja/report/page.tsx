import type { Metadata } from "next";
import { GlobalReportPage } from "@/components/global/GlobalReportView";

// 개인 리포트 주소라 검색에 노출하지 않는다.
// 주소에 열람 키(k)가 들어 있어 다른 사이트로 넘어갈 때 주소가 전달되지 않게 한다.
export const metadata: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default function JaReportPage() {
  return (
    <div className="bg-starfield flex flex-1 flex-col items-center bg-background px-5 py-14">
      <div className="w-full max-w-md">
        <GlobalReportPage locale="ja" />
      </div>
    </div>
  );
}
