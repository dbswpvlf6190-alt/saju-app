import type { WuXing } from "@/lib/saju/ganzhi";
import type { TypeProfile } from "@/lib/saju/typeProfile";
import { ShareButton } from "./ShareButton";

/** /type-test 진입자에게만 보여주는 "유형 리빌" 카드. 같은 계산 결과(일간·오행)를
 * 정통 사주 톤 대신 MBTI 성격테스트 같은 캐주얼한 톤으로 먼저 보여줘서, 인스타에서
 * "나는 OO형 나왔는데 너는?" 하고 공유하기 좋은 첫 화면을 만든다. 아래에는 기존
 * ResultView의 정식 사주 결과가 그대로 이어진다 — 같은 무료→유료 동선을 재사용한다. */
export function TypeRevealCard({
  name,
  dayMasterMetaphor,
  dominantWuxing,
  type,
}: {
  name: string;
  dayMasterMetaphor: string;
  dominantWuxing: WuXing;
  type: TypeProfile;
}) {
  return (
    <div className="reveal-pop flex flex-col items-center gap-3 rounded-2xl border border-accent-gold/40 bg-accent-gold/10 p-6 text-center">
      <span className="text-xs font-medium tracking-[0.2em] text-accent-gold-soft">
        나의 사주 심리테스트 결과
      </span>
      <h2 className="font-serif text-3xl text-accent-gold-soft">
        {name ? `${name}님은 ` : "나는"}
        {type.typeName}
      </h2>
      <p className="text-sm text-foreground-muted">{dayMasterMetaphor}</p>

      <div className="mt-2 flex w-full flex-col gap-2 text-left">
        <p className="rounded-xl bg-background-elevated/60 px-3 py-2 text-sm text-foreground">
          💚 {type.synergyNote}
        </p>
        <p className="rounded-xl bg-background-elevated/60 px-3 py-2 text-sm text-foreground">
          ⚡ {type.tensionNote}
        </p>
      </div>

      <ShareButton
        title="사주랩 심리테스트"
        text={`나는 사주 심리테스트에서 ${type.typeName} 나왔어! 너는 무슨 유형일까? 🧪`}
        shareLabel="💬 내 유형 친구한테 자랑하기"
        ctaLabel="나도 유형 테스트 하기"
        card={{ variant: "saju", label: type.typeName, sub: dayMasterMetaphor, wuxing: dominantWuxing }}
        source="type_test"
      />

      <p className="mt-1 text-xs text-foreground-muted">↓ 전체 사주 결과도 함께 확인해보세요</p>
    </div>
  );
}
