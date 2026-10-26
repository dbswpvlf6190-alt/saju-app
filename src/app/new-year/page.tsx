import type { Metadata } from "next";
import Link from "next/link";
import { NewYearStandalone } from "@/components/saju/NewYearStandalone";
import { SiteFooter } from "@/components/saju/SiteFooter";
import { NEW_YEAR_REPORT_NAME, NEW_YEAR_REPORT_PRICE_KRW, NEW_YEAR_REPORT_TARGET_YEAR } from "@/lib/payment/config";

const TITLE = `${NEW_YEAR_REPORT_NAME} | 사주랩`;
const DESCRIPTION = `내 사주로 보는 ${NEW_YEAR_REPORT_TARGET_YEAR}년 정미년 흐름. 분기별 키워드와 월별 12개월 흐름, 조심할 달과 기회의 달까지 ${NEW_YEAR_REPORT_PRICE_KRW.toLocaleString()}원으로 확인하세요.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/new-year" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website" },
};

const CONTENTS = [
  ["총평", "올해의 기운이 내 사주와 만나는 방식"],
  ["분기별 키워드", "1~3월, 4~6월, 7~9월, 10~12월 한 줄 키워드"],
  ["월별 흐름 12개", "달마다 한 줄씩, 그 달에 하면 좋은 행동"],
  ["조심할 달 · 기회의 달", "내 사주에서 부딪히거나 맺어지는 달"],
  ["일 · 돈 · 사람", "세 가지 영역 한 줄 정리"],
  ["실천 조언 3가지", "오늘부터 시작할 수 있는 행동"],
] as const;

export default function NewYearPage() {
  return (
    <div className="bg-starfield flex flex-1 flex-col items-center bg-background px-5 py-14">
      <main className="flex w-full max-w-md flex-col items-center gap-5 text-center">
        <span className="text-xs font-medium tracking-[0.2em] text-[#e8a37f]">{NEW_YEAR_REPORT_TARGET_YEAR} 丁未年</span>
        <h1 className="font-serif text-3xl leading-snug text-foreground">
          내 사주로 보는
          <br />
          {NEW_YEAR_REPORT_TARGET_YEAR}년 신년운세
        </h1>
        <p className="max-w-xs text-sm leading-relaxed text-foreground-muted">
          누구에게나 같은 말이 아니라, 내 사주와 {NEW_YEAR_REPORT_TARGET_YEAR}년의 기운이 만나는 지점을 월별로
          짚어드려요. 좋다 나쁘다 단정하지 않고, 흐름과 쓰면 좋은 방법을 알려드려요.
        </p>

        <ul className="flex w-full flex-col gap-2 rounded-2xl border border-border-subtle bg-background-card/70 p-4 text-left">
          {CONTENTS.map(([title, desc]) => (
            <li key={title} className="flex flex-col">
              <span className="text-sm font-medium text-[#e8a37f]">{title}</span>
              <span className="text-xs text-foreground-muted">{desc}</span>
            </li>
          ))}
        </ul>

        <p className="text-xs leading-relaxed text-foreground-muted">
          사주에서는 해가 바뀌는 때를 1월 1일이 아니라 <strong className="text-foreground">입춘(2월 4일경)</strong>으로
          봐요. 그래서 1월은 아직 지난해(병오년) 기운이 이어지는 달로 풀이해요. 한국 전통 사주 명리학을 바탕으로
          AI가 작성하며, 재미와 참고용으로 봐주세요.
        </p>
      </main>

      <div className="mt-8 flex w-full max-w-md flex-col items-center gap-3">
        <NewYearStandalone />
        <p className="text-center text-xs text-foreground-muted">
          결제 전 <Link href="/refund" className="underline underline-offset-4">환불 안내</Link>를 확인해 주세요.
        </p>
      </div>

      <SiteFooter />
    </div>
  );
}
