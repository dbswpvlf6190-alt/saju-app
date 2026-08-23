import Link from "next/link";
import { PREMIUM_REPORT_NAME, PREMIUM_REPORT_PRICE_KRW } from "@/lib/payment/config";

export function SiteFooter() {
  return (
    <footer className="mt-16 flex w-full max-w-md flex-col items-center gap-4 border-t border-border-subtle pt-8 text-center text-xs text-foreground-muted">
      <p>
        판매 상품: {PREMIUM_REPORT_NAME} · {PREMIUM_REPORT_PRICE_KRW.toLocaleString()}원 (결제 즉시
        제공되는 디지털 콘텐츠)
      </p>
      <nav className="flex gap-4">
        <Link href="/terms" className="underline underline-offset-4">
          이용약관
        </Link>
        <Link href="/privacy" className="underline underline-offset-4">
          개인정보처리방침
        </Link>
        <Link href="/refund" className="underline underline-offset-4">
          환불정책
        </Link>
      </nav>
      <p className="leading-relaxed">
        상호: 대국민스토어 · 대표: 윤제필 · 사업자등록번호: 717-04-02822
        <br />
        경상남도 창원시 의창구 동읍 용정길46번길 53 성진5차 1001호
      </p>
    </footer>
  );
}
