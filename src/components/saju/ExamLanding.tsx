import Link from "next/link";
import { SajuFlow } from "./SajuFlow";
import { SiteFooter } from "./SiteFooter";
import type { ReviewItem } from "./ReviewList";
import { formatExamDate, getSeasonStatus, type ExamSeason, type SeasonStatus } from "@/lib/exam/seasons";

function headline(season: ExamSeason, status: SeasonStatus): string[] {
  if (status.phase === "active") {
    const first = status.events[0];
    if (first.kind === "today") return [`오늘은 ${first.event.label} 날,`, "끝까지 응원해요"];
    // 시험이 여러 개면 위 eyebrow에 시험 이름이 있으니 제목엔 회차만 써서 줄바꿈이 어색하지 않게 한다.
    const noun = season.events.length > 1 ? first.event.label : season.noun;
    return [`${noun}까지 남은 ${first.daysLeft}일,`, "나에게 맞는 마무리 흐름은?"];
  }
  if (status.phase === "wrapUp") return [`${season.noun} 준비하느라 정말 수고했어요`, "다음 흐름도 궁금하다면?"];
  return ["지금 나에게 필요한", "합격운 흐름은?"];
}

/** 시험 시즌 랜딩(수능·임용 공용). 계산·상품·결제 동선은 홈과 같고, 시험일 D-day와 문구,
 * 응원 링크(?cheer=)로 들어온 사람을 위한 배너만 다르다. 특정 대학·합격 확률은 다루지 않는다. */
export function ExamLanding({
  season,
  cheerFrom,
  reviews,
}: {
  season: ExamSeason;
  /** 응원 링크로 들어온 경우 보낸 사람 이름(없으면 빈 문자열). 응원 링크가 아니면 null. */
  cheerFrom: string | null;
  reviews: ReviewItem[];
}) {
  const status = getSeasonStatus(season, new Date());
  const [line1, line2] = headline(season, status);

  return (
    <div className="bg-starfield flex flex-1 flex-col items-center bg-background px-5 py-14">
      <main className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        {cheerFrom !== null && (
          <p className="w-full rounded-2xl border border-sky-300/40 bg-sky-300/10 px-4 py-3 text-left text-sm leading-relaxed text-foreground">
            📚{" "}
            <strong className="text-sky-200">
              {cheerFrom ? `${cheerFrom}님이` : "친구가"} 보낸 {season.noun} 응원이 도착했어요.
            </strong>{" "}
            30초면 내 합격운 흐름을 볼 수 있어요.
          </p>
        )}

        {status.phase === "active" && (
          <div className="flex flex-wrap justify-center gap-2">
            {status.events.map((s) => (
              <span
                key={s.event.label}
                className="inline-flex items-baseline gap-2 rounded-full border border-sky-300/50 bg-sky-300/10 px-3.5 py-1.5"
              >
                <strong className="font-serif text-base tabular-nums text-sky-200">
                  {s.event.label} {s.kind === "today" ? "D-DAY" : `D-${s.daysLeft}`}
                </strong>
                <span className="text-xs text-foreground-muted">
                  {formatExamDate(s.event.date)}
                  {!s.event.confirmed && " 예정"}
                </span>
              </span>
            ))}
          </div>
        )}

        <span className="text-xs font-medium tracking-[0.2em] text-accent-gold-soft">{season.eyebrow}</span>
        <h1 className="font-serif text-3xl leading-snug text-foreground">
          {line1}
          <br />
          {line2}
        </h1>
        <p className="max-w-xs text-sm leading-relaxed text-foreground-muted">
          생년월일시 하나로 지금 나에게 맞는 마무리 방식과 주의할 점을 무료로 확인해보세요. 합격 여부나 확률이
          아니라, 강점과 주의할 점을 함께 짚어드려요.
        </p>

        <div className="mt-2 flex w-full max-w-xs flex-col gap-2">
          <a
            href="#saju-form"
            className="rounded-xl bg-accent-gold px-4 py-3 text-center text-sm font-semibold text-[#1a1430]"
          >
            📚 내 합격운 흐름 확인하기
          </a>
          <Link
            href="/"
            className="rounded-xl border border-border-subtle px-4 py-2.5 text-center text-sm font-medium text-foreground-muted transition-colors hover:border-accent-gold hover:text-accent-gold-soft"
          >
            🔮 정식 사주풀이로 바로 가기
          </Link>
        </div>
        {season.audienceNote && <p className="text-xs text-foreground-muted">{season.audienceNote}</p>}
        <Link
          href={season.kind === "suneung" ? "/exam-luck/imyong" : "/exam-luck"}
          className="text-xs text-foreground-muted underline underline-offset-4 hover:text-accent-gold-soft"
        >
          {season.kind === "suneung" ? "임용시험 준비 중이라면 → 임용 합격운" : "수능 합격운 보러 가기 →"}
        </Link>
      </main>

      <div id="saju-form" className="mt-10 w-full max-w-md scroll-mt-10">
        <SajuFlow reviews={reviews} entryMode="examLuck" examKind={season.kind} />
      </div>

      <SiteFooter />
    </div>
  );
}
