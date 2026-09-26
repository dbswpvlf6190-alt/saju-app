// 시험 시즌 페이지(/exam-luck, /exam-luck/imyong) 설정. 날짜는 공식 발표로 확인한 것만
// confirmed: true로 두고, 아직 공고 전인 날짜는 "예정"으로 표시한다 — 틀린 D-day를 보여주면
// 수험생에게 혼란을 준다. 공고가 나오면 여기 날짜와 confirmed만 고치면 된다.

export type ExamKind = "suneung" | "imyong";

export interface ExamEvent {
  label: string;
  /** 한국 시간 기준 시험일 (YYYY-MM-DD) */
  date: string;
  confirmed: boolean;
}

export interface ExamSeason {
  kind: ExamKind;
  path: string;
  /** 응원 문구에 들어가는 짧은 이름. 예: "수능 응원이 도착했어요" */
  noun: string;
  eyebrow: string;
  events: ExamEvent[];
  /** 모든 시험일이 지난 뒤 "수고했어요" 문구를 이 날짜(포함)까지 보여주고, 그 뒤엔 숨긴다. */
  wrapUpUntil: string;
  audienceNote: string | null;
}

export const EXAM_SEASONS: Record<ExamKind, ExamSeason> = {
  suneung: {
    kind: "suneung",
    path: "/exam-luck",
    noun: "수능",
    eyebrow: "SAJU LAB · 2027 수능 합격운",
    // 교육부 발표: 2027학년도 대학수학능력시험 2026년 11월 19일(목) 시행
    events: [{ label: "수능", date: "2026-11-19", confirmed: true }],
    wrapUpUntil: "2026-12-31",
    audienceNote: "👪 학부모님이라면 수험생 자녀의 생년월일시로도 볼 수 있어요.",
  },
  imyong: {
    kind: "imyong",
    path: "/exam-luck/imyong",
    noun: "임용",
    eyebrow: "SAJU LAB · 2027 임용 합격운",
    events: [
      // 2027학년도 유·초·특 교사 임용 1차: 각 시·도교육청 선발 공고(2026년 9월) 기준
      { label: "초등 1차", date: "2026-11-07", confirmed: true },
      // 중등 1차는 2026년 9월 30일 시행계획 본공고 전이라 예정일로만 둔다
      { label: "중등 1차", date: "2026-11-28", confirmed: false },
    ],
    wrapUpUntil: "2027-01-31",
    audienceNote: "유아·초등·중등·특수 어느 과정이든 볼 수 있어요.",
  },
};

export type EventStatus =
  | { kind: "upcoming"; event: ExamEvent; daysLeft: number }
  | { kind: "today"; event: ExamEvent };

export type SeasonStatus =
  | { phase: "active"; events: EventStatus[] }
  | { phase: "wrapUp" }
  | { phase: "off" };

/** 한국 시간 기준 오늘 날짜(YYYY-MM-DD). 서버가 어느 지역에 있든 D-day가 하루 밀리지 않게 한다. */
export function kstDateString(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
}

function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

export function getSeasonStatus(season: ExamSeason, now: Date): SeasonStatus {
  const today = kstDateString(now);
  const events: EventStatus[] = [];
  for (const event of season.events) {
    const daysLeft = daysBetween(today, event.date);
    if (daysLeft > 0) events.push({ kind: "upcoming", event, daysLeft });
    else if (daysLeft === 0) events.push({ kind: "today", event });
  }
  if (events.length > 0) return { phase: "active", events };
  return daysBetween(today, season.wrapUpUntil) >= 0 ? { phase: "wrapUp" } : { phase: "off" };
}

/** "11월 19일(목)" */
export function formatExamDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}월 ${d}일(${weekday})`;
}

/** 응원 링크(?cheer=)에 붙은 보낸 사람 이름. 화면에 그대로 쓰므로 길이만 자른다(React가 이스케이프한다). */
export function sanitizeCheerName(raw: string | string[] | undefined): string | null {
  if (typeof raw !== "string") return null;
  return raw.trim().slice(0, 20);
}
