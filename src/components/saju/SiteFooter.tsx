import Link from "next/link";
import { PRODUCT_CATALOG, type ProductType } from "@/lib/payment/config";

// 카드사·PG 심사는 사이트 하단의 판매 상품·가격이 실제로 파는 것과 같은지 본다. 이름·가격은 결제 서버가 쓰는
// PRODUCT_CATALOG에서 그대로 가져와서, 상품이나 가격이 바뀌어도 하단 표기가 따로 놀지 않게 한다.
const FOOTER_PRODUCTS: { type: ProductType; note?: string }[] = [
  { type: "premium_report" },
  { type: "single_section" },
  { type: "section_upgrade", note: "1가지 구매 후 추가 결제" },
  { type: "compatibility_report" },
  { type: "new_year_report", note: "상세 분석 구매 후 추가 상품" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 flex w-full max-w-md flex-col items-center gap-4 border-t border-border-subtle pt-8 text-center text-xs text-foreground-muted">
      <div className="flex flex-col gap-1">
        <p>판매 상품 (결제 즉시 제공되는 디지털 콘텐츠)</p>
        <ul className="flex flex-col gap-0.5">
          {FOOTER_PRODUCTS.map(({ type, note }) => (
            <li key={type}>
              {PRODUCT_CATALOG[type].name} · {PRODUCT_CATALOG[type].amount.toLocaleString()}원
              {note && ` (${note})`}
            </li>
          ))}
        </ul>
      </div>
      <nav className="flex gap-4">
        <Link href="/ilgan" className="underline underline-offset-4">
          일간별 성격
        </Link>
        <Link href="/my" className="underline underline-offset-4">
          내 구매내역
        </Link>
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
        통신판매업신고번호: 제2024-창원의창-0186호
        <br />
        유선번호: 055-255-3564 · 휴대폰: 010-7501-3546
        <br />
        경상남도 창원시 의창구 동읍 용정길46번길 53 성진5차 1001호
      </p>
    </footer>
  );
}
