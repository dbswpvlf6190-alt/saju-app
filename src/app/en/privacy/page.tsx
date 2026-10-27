import type { Metadata } from "next";
import { GlobalLegalPage } from "@/components/legal/GlobalLegalPage";
import { GLOBAL_LEGAL } from "@/lib/global/legalCopy";
import { GLOBAL_PAYMENTS_ENABLED } from "@/lib/payment/config";

// 법률 검토 전 초안이라 결제가 열리기 전에는 검색에 노출하지 않는다.
export const metadata: Metadata = {
  title: `${GLOBAL_LEGAL.en.privacy.title} | Saju Lab`,
  robots: { index: GLOBAL_PAYMENTS_ENABLED, follow: GLOBAL_PAYMENTS_ENABLED },
};

export default function EnPrivacyPage() {
  return <GlobalLegalPage locale="en" kind="privacy" />;
}
