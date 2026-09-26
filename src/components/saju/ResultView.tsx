"use client";

import { useEffect, useState, type ComponentProps } from "react";
import Link from "next/link";
import type { SajuResult } from "@/lib/saju";
// 배럴(@/lib/saju)을 거치면 번들러가 engine.ts(lunar-typescript, 수백 KB)까지 딸려오는 걸
// 완전히 트리쉐이킹하지 못해서, 클라이언트 컴포넌트에서는 실제로 쓰는 서브모듈을 직접 가져온다.
import { generateFreeContent, getPremiumSections, type PremiumSection } from "@/lib/saju/content";
import { WUXING_PERSONA } from "@/lib/saju/persona";
import { getDailyFortuneDetail } from "@/lib/saju/dailyFortune";
import { getTypeProfile } from "@/lib/saju/typeProfile";
import { getExamLuckFlow } from "@/lib/saju/examLuck";
import { PillarCard } from "./PillarCard";
import { WuxingBar } from "./WuxingBar";
import { PremiumUnlock } from "./PremiumUnlock";
import { AdSlot } from "./AdSlot";
import { ShareButton } from "./ShareButton";
import { ReferralCard } from "./ReferralCard";
import { DailyFortuneCard } from "./DailyFortuneCard";
import { PushOptIn } from "./PushOptIn";
import { TypeRevealCard } from "./TypeRevealCard";
import { ExamLuckCard } from "./ExamLuckCard";
import type { ExamKind } from "@/lib/exam/seasons";
import { WuxingMascot } from "./WuxingMascot";
import { ReviewList, type ReviewItem } from "./ReviewList";
import { trackEvent } from "@/lib/analytics/track";

// 홈 화면에서 "돈 문제/연애가 궁금해요"를 먼저 고르고 들어온 경우, 그 관심사를 잠금
// 미리보기 맨 앞으로 올린다 — 같은 계산 결과를 다시 하는 게 아니라 보여주는 순서만 바꾸는 것이다.
function orderByFocus(sections: PremiumSection[], focus?: "wealth" | "love"): PremiumSection[] {
  if (!focus) return sections;
  return [...sections.filter((s) => s.key === focus), ...sections.filter((s) => s.key !== focus)];
}

export function ResultView({
  name,
  result,
  onRestart,
  resumePaymentId,
  reviews,
  revealMode,
  focus,
  examKind = "suneung",
}: {
  name: string;
  result: SajuResult;
  onRestart: () => void;
  resumePaymentId: string | null;
  reviews: ReviewItem[];
  /** /type-test·/exam-luck처럼 별도 랜딩으로 들어온 경우에만 지정된다 — 같은 계산 결과를
   * 그 랜딩에 맞는 카드로 먼저 보여준 뒤, 아래는 기존 정식 사주 결과 동선을 그대로 이어간다. */
  revealMode?: "typeTest" | "examLuck";
  /** 홈 화면 페르소나 선택("돈 문제가 궁금해요"/"연애가 궁금해요")에서 넘어온 관심사.
   * 상세 분석 항목 노출 순서만 바꾸고, 계산이나 유료 상품 구성에는 영향 없다. */
  focus?: "wealth" | "love";
  examKind?: ExamKind;
}) {
  const [isPaid, setIsPaid] = useState(false);
  const [showPillars, setShowPillars] = useState(false);
  const free = generateFreeContent(result);
  const persona = WUXING_PERSONA[result.dayPillar.ganWuxing];
  const premiumSections = orderByFocus(getPremiumSections(result), focus);
  const daily = getDailyFortuneDetail(result);
  const type = revealMode === "typeTest" ? getTypeProfile(result.dayPillar.ganKor) : null;
  const examLuck = revealMode === "examLuck" ? getExamLuckFlow(free.dominantWuxing) : null;

  const freeShare: ComponentProps<typeof ShareButton> = {
    title: "사주랩",
    text: `나의 사주는 ${free.dayMasterLabel}래요. 근데 이게 무슨 뜻인지 알아? 🔮 (30초, 무료로 확인)`,
    shareLabel: "💬 내 사주, 친구는 뭐라고 나올까?",
    ctaLabel: "무료로 내 사주 확인하기",
    card: {
      variant: "saju",
      label: free.dayMasterLabel,
      sub: free.dayMasterMetaphor,
      wuxing: free.dominantWuxing,
    },
    source: "free_result",
  };

  useEffect(() => {
    trackEvent("free_result_view", { productType: "premium_report" });
  }, []);

  return (
    <div className="flex w-full max-w-md flex-col gap-8 pb-16">
      {type && (
        <TypeRevealCard
          name={name}
          dayMasterMetaphor={free.dayMasterMetaphor}
          wuxing={result.dayPillar.ganWuxing}
          type={type}
        />
      )}

      {examLuck && (
        <ExamLuckCard name={name} dominantWuxing={free.dominantWuxing} flow={examLuck} examKind={examKind} />
      )}

      {/* ① 나의 사주 핵심 결과 — 결과가 뜨는 순간을 "펼쳐지는" 느낌으로 주기 위해 헤드라인은
          팝인, 네 기둥은 순서대로 나타나게 한다(reveal-in/-pop, globals.css). */}
      <div className="reveal-pop flex flex-col items-center gap-2 text-center">
        <span className="text-sm text-foreground-muted">
          {name ? `${name}님의 사주` : "나의 사주"}
        </span>
        {/* 유형/합격운 카드가 위에서 이미 마스코트와 비유를 크게 보여줬다면 반복하지 않는다. */}
        {!revealMode && <WuxingMascot wuxing={result.dayPillar.ganWuxing} size={104} />}
        <h2 className="font-serif text-2xl text-accent-gold-soft">{free.dayMasterLabel}</h2>
        {revealMode !== "typeTest" && (
          <p className="text-sm text-foreground-muted">{free.dayMasterMetaphor}</p>
        )}
        <p className="mt-1 max-w-xs text-sm leading-relaxed text-foreground">{free.balanceNote}</p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowPillars((v) => !v)}
          className="flex items-center justify-center gap-1 text-xs text-foreground-muted underline underline-offset-4"
        >
          {showPillars ? "사주 원국·오행 분포 닫기 ▲" : "사주 원국·오행 분포 보기 ▾"}
        </button>
        {showPillars && (
          <>
            <div className="grid grid-cols-4 gap-2">
              <PillarCard label="년주" pillar={result.yearPillar} revealDelayMs={80} />
              <PillarCard label="월주" pillar={result.monthPillar} revealDelayMs={140} />
              <PillarCard label="일주" pillar={result.dayPillar} revealDelayMs={200} />
              <PillarCard label="시주" pillar={result.timePillar} revealDelayMs={260} />
            </div>
            <div className="rounded-2xl border border-border-subtle bg-background-card/70 p-4">
              <WuxingBar percent={result.wuxingPercent} />
            </div>
          </>
        )}
      </div>

      {/* 캐릭터 후킹 — 성격을 읽기 시작하기 전에 페르소나가 먼저 말을 걸어 궁금증을
          심어둔다. 결정적인 내용은 밝히지 않고 좋은 쪽/안 좋은 쪽만 모호하게 건다. */}
      <div className="flex flex-col gap-2 rounded-2xl border border-accent-gold/25 bg-background-card/70 p-4">
        <div className="flex items-center gap-2">
          <WuxingMascot wuxing={result.dayPillar.ganWuxing} size={32} />
          <span className="text-xs font-medium text-accent-gold-soft">
            {persona.name} · {persona.role}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-foreground">{persona.hookLine}</p>
      </div>

      {/* ② 기본 성향 — 성격 설명으로 공감을 쌓은 바로 다음 문장을 블러 처리해서 궁금증으로
          이어붙인다(free.personalityHook, content.ts). 상세 분석 잠금 미리보기(PremiumUnlock)와
          같은 방식이지만 여긴 오행(5종) 대신 일간(10종) 분기라 훨씬 구체적으로 느껴진다. */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-background-card/70 p-4">
        <h3 className="text-sm font-medium text-foreground-muted">타고난 성격</h3>
        <p className="font-serif text-sm text-accent-gold-soft">
          {persona.name}: &ldquo;{persona.introLine}&rdquo;
        </p>
        <p className="leading-relaxed text-foreground">{free.personality}</p>
        {/* 블러 문단은 궁금증만 걸면 되므로 3줄까지만 보여준다. 잠금 표시는 잘리지 않게 앞에 둔다. */}
        <p className="line-clamp-3 leading-relaxed text-foreground">
          {free.personalityHook.visible}{" "}
          <span className="text-xs text-accent-gold-soft">🔒</span>{" "}
          <span className="select-none text-foreground-muted/40 blur-[3px]">
            {free.personalityHook.blind}
          </span>
        </p>
      </div>


      {/* ⑦ 전환 유도 — 유료 미리보기(PremiumUnlock) 바로 앞에서 다음 단계를 안내한다.
          캐릭터 후킹 문구는 성격 카드 위로 옮겨 읽기 시작하는 시점에 먼저 궁금증을 건다. */}
      <p className="px-2 text-center text-sm font-medium text-foreground">더 자세한 분석이 궁금하다면?</p>

      {/* ⑧~⑩ 상세 분석 미리보기 + 포함 내용 + 가격 (PremiumUnlock 내부) */}
      <PremiumUnlock
        result={result}
        name={name}
        premiumSections={premiumSections}
        resumePaymentId={resumePaymentId}
        onUnlockedChange={setIsPaid}
      />

      {/* 실제 이용 후기 — 4,900원 가치·CTA를 막 확인한 시점 바로 다음에 사회적 증거를
          붙여서, 페이지 맨 아래(구매 판단이 끝난 뒤)에 있던 것보다 설득에 도움이 되게 한다. */}
      {/* 구매하지 않은 방문자에게 "첫 후기를 남겨주세요"는 할 수 없는 부탁이라, 후기가 없으면 통째로 숨긴다. */}
      {reviews.length > 0 && <ReviewList reviews={reviews} />}

      {/* 여기서부터는 핵심 전환 목표(상세 분석 구매) 뒤에 오는 부가 기능들 — 유료 CTA보다
          눈에 띄지 않게 아래로 내려서 배치한다. */}
      <DailyFortuneCard daily={daily} />

      {/* "오늘의 운세"를 막 확인한 바로 다음이 재방문 알림을 제안하기 가장 자연스러운
          시점이라 이 자리에 둔다. */}
      <PushOptIn />

      <Link
        href="/compatibility"
        className="rounded-2xl border border-dashed border-border-subtle px-4 py-3 text-center text-sm font-medium text-foreground-muted transition-colors hover:border-accent-gold hover:text-accent-gold-soft"
      >
        ❤️ 우리 궁합도 확인해보기
      </Link>

      <div className="flex flex-col gap-2">
        {/* 결제한 사람에게는 보상(무료 상세 분석)이 의미가 없어 기존 공유 버튼만 둔다. */}
        {isPaid ? (
          <ShareButton {...freeShare} />
        ) : (
          <ReferralCard result={result} persona={persona} share={freeShare} />
        )}
        <button
          type="button"
          onClick={onRestart}
          className="text-sm text-foreground-muted underline underline-offset-4"
        >
          다시 입력하기
        </button>
      </div>

      {/* 광고는 구매·공유·궁합 탐색 등 서비스 자체의 전환 동선을 다 지나간 뒤,
          정말 마지막에만 노출한다 — 동선 중간에 끼어 이탈을 유도하지 않도록. */}
      {!isPaid && <AdSlot />}
    </div>
  );
}
