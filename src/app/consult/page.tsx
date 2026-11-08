import type { Metadata } from "next";
import Link from "next/link";
import { ConsultCheckout } from "@/components/consult/ConsultCheckout";
import { isConsultProductType } from "@/lib/consult/plans";
import { AI_NOTICE } from "@/lib/consult/safety";

export const metadata: Metadata = {
  title: "AI 사주 상담 | 사주랩",
  description: "내 사주로 궁금한 것을 바로 물어보는 사주명리학 AI 상담. 2027 신년운세 리포트와 가족 상담까지.",
};

// 결제 전 체험용 콘텐츠(전자상거래법 시행령 제21조의2: 청약철회 제한의 전제 조건). 실제 답변 형식 그대로 보여 준다.
const SAMPLE = {
  q: "내년에 가게를 넓히려고 하는데, 언제쯤이 좋을까요?",
  a: [
    "타고난 사주에 흙의 기운이 두텁고 물의 기운이 적은 편이라, 무언가를 새로 벌이기보다 쌓아 온 것을 다지는 데 강한 분이에요.",
    "2027년은 전반적으로 일이 늘어나는 흐름이 보이는데, 특히 늦봄(5~6월)에 사람과 기회가 함께 들어오는 기운이 있어요. 확장을 생각하신다면 이때 계약이나 준비를 시작하는 쪽이 흐름과 잘 맞아요.",
    "다만 초겨울(11~12월)은 돈이 나가는 기운이 겹쳐 보여요. 큰 지출은 그 전에 마무리하고, 이 시기에는 무리하게 늘리기보다 점검하는 데 쓰시면 좋아요.",
  ],
  next: "다음에 물어볼 만한 것: 확장할 때 함께하면 좋은 사람의 특징은? / 올해 돈이 새는 달은 언제?",
};

type SearchParams = Promise<{ product?: string }>;

export default async function ConsultPage({ searchParams }: { searchParams: SearchParams }) {
  const { product } = await searchParams;
  return (
    <div className="flex w-full max-w-md flex-col gap-8 px-5 py-10">
      <header className="flex flex-col gap-3 text-center">
        <p className="text-sm font-medium text-accent-gold-soft">사주명리학 전문 AI 상담</p>
        <h1 className="font-serif text-2xl leading-snug text-foreground">
          내 사주로, 궁금한 것을
          <br />
          바로 물어보세요
        </h1>
        <p className="text-base leading-relaxed text-foreground-muted">
          생년월일시로 사주를 계산하고, 묻는 질문마다 내 사주 흐름에 맞춰 답해 드려요. 24시간 언제든, 기다림 없이.
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-background-card/70 p-4">
        <span className="text-xs font-medium text-foreground-muted">상담 예시 (실제 답변 형식)</span>
        <p className="self-end rounded-2xl rounded-br-sm bg-accent-gold/15 px-3.5 py-2.5 text-base text-foreground">{SAMPLE.q}</p>
        <div className="flex flex-col gap-2 rounded-2xl rounded-bl-sm bg-background-elevated px-3.5 py-3 text-base leading-relaxed text-foreground">
          {SAMPLE.a.map((p) => (
            <p key={p}>{p}</p>
          ))}
          <p className="text-sm text-accent-gold-soft">{SAMPLE.next}</p>
        </div>
        <p className="text-xs text-foreground-muted">{AI_NOTICE}</p>
      </section>

      <section className="flex flex-col gap-1.5 text-sm leading-relaxed text-foreground-muted">
        <p>
          · 먼저 무료로 내 사주를 보고 싶다면{" "}
          <Link href="/" className="text-accent-gold-soft underline underline-offset-4">
            무료 사주 풀이
          </Link>
          부터 보셔도 돼요.
        </p>
        <p>· 질병·수명·주식 종목·로또 번호는 답하지 않아요. 결정은 참고로만 써 주세요.</p>
        <p>
          · <strong className="text-foreground">열어 본 리포트와 사용한 질문·이용일수는 환불되지 않아요.</strong> 쓰지 않은
          질문권은 결제 후 7일 안에 환불돼요.{" "}
          <Link href="/refund" className="underline underline-offset-4">
            환불정책
          </Link>
        </p>
      </section>

      <ConsultCheckout initialProduct={isConsultProductType(product) ? product : undefined} />
    </div>
  );
}
