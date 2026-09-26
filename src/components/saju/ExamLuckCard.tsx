import type { WuXing } from "@/lib/saju/ganzhi";
import type { ExamLuckFlow } from "@/lib/saju/examLuck";
import { ShareButton } from "./ShareButton";
import { WuxingMascot } from "./WuxingMascot";
import { ExamCheerShare } from "./ExamCheerShare";
import { EXAM_SEASONS, getSeasonStatus, type ExamKind } from "@/lib/exam/seasons";
import type { PremiumSection } from "@/lib/saju/content";
import { PREMIUM_REPORT_PRICE_KRW } from "@/lib/payment/config";
import { trackEvent } from "@/lib/analytics/track";

/** /exam-luck 진입자에게만 보여주는 "합격운 흐름" 카드. 특정 대학명이나 숫자 확률은
 * 절대 쓰지 않는다(examLuck.ts 참고) — 강점과 주의할 점을 함께 담은 정성적 흐름만
 * 보여준다. TypeRevealCard와 같은 구조로, 아래에는 기존 정식 사주 결과가 그대로 이어진다. */
export function ExamLuckCard({
  name,
  dominantWuxing,
  flow,
  examKind,
  lockedPreview,
}: {
  name: string;
  dominantWuxing: WuXing;
  flow: ExamLuckFlow;
  examKind: ExamKind;
  /** 유료 상세 분석 중 맨 앞(합격운 진입자는 직업운) 항목 — 잠긴 미리보기로 이어서 보여준다. */
  lockedPreview: PremiumSection;
}) {
  return (
    <div className="reveal-pop flex flex-col items-center gap-3 rounded-2xl border border-accent-gold/40 bg-accent-gold/10 p-6 text-center">
      <span className="text-xs font-medium tracking-[0.2em] text-accent-gold-soft">
        나의 합격운 흐름
      </span>
      <WuxingMascot wuxing={dominantWuxing} size={100} />
      <h2 className="font-serif text-2xl text-accent-gold-soft">
        {name ? `${name}님은 ` : "나는 "}
        {flow.badgeLabel}
      </h2>
      <p className="text-sm text-foreground-muted">{flow.title}</p>
      <p className="text-sm leading-relaxed text-foreground">{flow.body}</p>

      <ExamPremiumPromo name={name} examKind={examKind} lockedPreview={lockedPreview} />

      <ExamCheerShare examKind={examKind} />

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

/** 합격운 카드 안의 상세 분석 유도. 손실회피 쪽으로 짰다 — 이미 입력한 내 사주에서 "아직 못 본 것",
 * 시험까지 줄어드는 날짜, 하루 단위로 쪼갠 가격. 다만 모두 사실인 것만 쓴다(잠긴 항목 수·D-day·가격은
 * 실제 값, 가짜 마감·할인·"안 보면 떨어진다" 같은 공포 문구는 쓰지 않는다 — 환불·신고로 돌아온다).
 * 버튼은 결제 폼이 있는 PremiumUnlock(#premium-unlock)으로 스크롤만 하고, 결제 퍼널 이벤트와 섞이지
 * 않게 별도 이벤트로 센다. */
function ExamPremiumPromo({
  name,
  examKind,
  lockedPreview,
}: {
  name: string;
  examKind: ExamKind;
  lockedPreview: PremiumSection;
}) {
  const status = getSeasonStatus(EXAM_SEASONS[examKind], new Date());
  const next = status.phase === "active" ? status.events[0] : null;
  const daysLeft = next && next.kind !== "today" ? next.daysLeft : null;
  const who = name ? `${name}님` : "내";
  const price = PREMIUM_REPORT_PRICE_KRW.toLocaleString();

  return (
    <div className="mt-1 flex w-full flex-col gap-3 rounded-2xl border border-accent-gold/60 bg-background-card/80 p-4 text-left">
      <span className="text-xs font-semibold tracking-[0.15em] text-accent-gold-soft">🔒 여기까지가 무료예요</span>
      <p className="font-serif text-lg leading-snug text-foreground">
        {who} 사주에서 아직 못 본 분석이
        <br />
        <span className="text-accent-gold-soft">5개 더 남아 있어요</span>
      </p>

      <div className="rounded-xl border border-border-subtle bg-background/40 px-3 py-2.5">
        <span className="text-sm font-medium text-foreground">{lockedPreview.title}</span>
        <p className="mt-0.5 text-xs leading-relaxed text-foreground-muted">{lockedPreview.teaser}</p>
        <p className="mt-0.5 line-clamp-2 select-none text-xs leading-relaxed text-foreground-muted/40 blur-[2.5px]">
          {lockedPreview.previewSnippet}
        </p>
      </div>

      <ul className="flex flex-col gap-1.5 text-sm leading-relaxed text-foreground">
        <li>
          ✔︎ 위 흐름은 오행 하나로 본 방향이에요. <strong>직업운·올해의 흐름</strong>은 {who} 사주 전체를
          풀어야 보여요.
        </li>
        {daysLeft !== null && next && (
          <li>
            ⏳ {next.event.label}까지 <strong className="text-accent-gold-soft">D-{daysLeft}</strong>. 늦게 볼수록 이
            흐름을 써먹을 날이 줄어들어요.
          </li>
        )}
        <li>✔︎ 이미 입력한 생년월일시로 바로 열려요. 결제 후 즉시 확인.</li>
      </ul>

      <a
        href="#premium-unlock"
        onClick={() => trackEvent("exam_promo_click", { exam: examKind })}
        className="rounded-xl bg-accent-gold px-4 py-3.5 text-center text-base font-semibold text-[#1a1430] transition-opacity hover:opacity-90"
      >
        🔓 남은 5개 분석 바로 열기
      </a>
      <p className="-mt-1 text-center text-xs text-foreground-muted">
        {price}원
        {daysLeft !== null &&
          ` · 시험까지 하루 약 ${Math.ceil(PREMIUM_REPORT_PRICE_KRW / daysLeft).toLocaleString()}원`}{" "}
        · 추가 결제 없음
      </p>
    </div>
  );
}
