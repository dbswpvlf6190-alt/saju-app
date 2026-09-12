import type { WuXing } from "@/lib/saju/ganzhi";
import type { ExamLuckFlow } from "@/lib/saju/examLuck";
import { ShareButton } from "./ShareButton";

/** /exam-luck 진입자에게만 보여주는 "합격운 흐름" 카드. 특정 대학명이나 숫자 확률은
 * 절대 쓰지 않는다(examLuck.ts 참고) — 강점과 주의할 점을 함께 담은 정성적 흐름만
 * 보여준다. TypeRevealCard와 같은 구조로, 아래에는 기존 정식 사주 결과가 그대로 이어진다. */
export function ExamLuckCard({
  name,
  dominantWuxing,
  flow,
}: {
  name: string;
  dominantWuxing: WuXing;
  flow: ExamLuckFlow;
}) {
  return (
    <div className="reveal-pop flex flex-col items-center gap-3 rounded-2xl border border-accent-gold/40 bg-accent-gold/10 p-6 text-center">
      <span className="text-xs font-medium tracking-[0.2em] text-accent-gold-soft">
        나의 합격운 흐름
      </span>
      <h2 className="font-serif text-2xl text-accent-gold-soft">
        {name ? `${name}님은 ` : "나는"}
        {flow.badgeLabel}
      </h2>
      <p className="text-sm text-foreground-muted">{flow.title}</p>
      <p className="text-sm leading-relaxed text-foreground">{flow.body}</p>

      <p className="mt-1 rounded-xl bg-background-elevated/60 px-3 py-2 text-xs leading-relaxed text-foreground-muted">
        ⚠️ 이 흐름은 노력의 방향과 마음가짐을 참고하는 콘텐츠예요. 특정 결과를 보장하지
        않으니, 실제 준비와 전략은 선생님·전문가와 함께 판단해주세요.
      </p>

      <ShareButton
        title="사주랩 합격운"
        text={`나의 합격운 흐름은 ${flow.badgeLabel}래! 너는 어떤 흐름일까? 📚`}
        shareLabel="💬 내 합격운 흐름 공유하기"
        ctaLabel="나도 합격운 흐름 보기"
        card={{ variant: "saju", label: flow.badgeLabel, sub: flow.title, wuxing: dominantWuxing }}
        source="exam_luck"
      />

      <p className="mt-1 text-xs text-foreground-muted">↓ 전체 사주 결과도 함께 확인해보세요</p>
    </div>
  );
}
