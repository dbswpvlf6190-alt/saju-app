import { SajuFlow } from "@/components/saju/SajuFlow";

export default function Home() {
  return (
    <div className="bg-starfield flex flex-1 flex-col items-center bg-background px-5 py-14">
      <main className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <span className="text-xs font-medium tracking-[0.2em] text-accent-gold-soft">
          SAJU READING
        </span>
        <h1 className="font-serif text-3xl leading-snug text-foreground">
          생년월일시로 읽는
          <br />
          나의 사주팔자
        </h1>
        <p className="max-w-xs text-sm leading-relaxed text-foreground-muted">
          정확한 절기·음양력 계산으로 나의 사주를 무료로 확인하고, 성격부터 오행 균형까지
          한눈에 살펴보세요.
        </p>
      </main>

      <div className="mt-10 w-full max-w-md">
        <SajuFlow />
      </div>
    </div>
  );
}
