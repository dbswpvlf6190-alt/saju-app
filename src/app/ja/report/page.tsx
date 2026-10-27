import type { Metadata } from "next";
import { GlobalReportPage } from "@/components/global/GlobalReportView";

// 개인 리포트 주소라 검색에 노출하지 않는다.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function JaReportPage() {
  return (
    <div className="bg-starfield flex flex-1 flex-col items-center bg-background px-5 py-14">
      <div className="w-full max-w-md">
        <GlobalReportPage locale="ja" />
      </div>
    </div>
  );
}
