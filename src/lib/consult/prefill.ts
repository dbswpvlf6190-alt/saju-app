import type { SajuInput } from "@/lib/saju/types";
import type { PersonFormValues } from "@/components/saju/PersonBirthFields";

// 신년운세를 산 손님이 이어서 AI 상담을 살 때 생일을 다시 넣지 않게(2026-11-21 주말 경영 C3).
// 생일은 개인정보라 주소(쿼리)에 싣지 않고, 같은 탭의 sessionStorage에만 잠깐 둔다(탭을 닫으면 사라짐).
const KEY = "saju:consultPrefill";
const TTL_MS = 60 * 60 * 1000;

export interface ConsultPrefill {
  input: SajuInput;
  name: string;
}

export function saveConsultPrefill(input: SajuInput, name: string): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ input, name: name.slice(0, 20), savedAt: Date.now() }));
  } catch {
    // 저장이 막힌 브라우저면 상담 화면에서 생일을 한 번 더 넣으면 된다.
  }
}

export function loadConsultPrefill(now = Date.now()): ConsultPrefill | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { input?: SajuInput; name?: string; savedAt?: number };
    if (!data.input || typeof data.savedAt !== "number" || now - data.savedAt > TTL_MS) return null;
    return { input: data.input, name: typeof data.name === "string" ? data.name : "" };
  } catch {
    return null;
  }
}

/** 저장된 생일을 상담 결제 화면의 입력칸 값으로 바꾼다. 시간을 모르면 '모름'으로. */
export function prefillToPerson(p: ConsultPrefill): PersonFormValues {
  const { input } = p;
  const timeUnknown = input.hour === undefined || input.hour === null;
  return {
    name: p.name,
    calendarType: input.calendarType,
    isLeapMonth: !!input.isLeapMonth,
    year: input.year,
    month: input.month,
    day: input.day,
    timeUnknown,
    hour: timeUnknown ? null : (input.hour ?? null),
    minute: timeUnknown ? null : (input.minute ?? 0),
    gender: input.gender,
  };
}
