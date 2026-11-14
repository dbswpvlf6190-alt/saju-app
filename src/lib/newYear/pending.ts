// 모바일 결제창(리디렉션)에서 실패·취소하고 /new-year/return으로 돌아오면 생일 계산 결과가 사라져,
// 손님이 생일을 처음부터 다시 넣어야 했다(2026-11-12). 결제창을 띄우기 직전에 결과를 이 탭(sessionStorage)에만
// 잠깐 저장해 두고, "다시 결제하기"로 /new-year?retry=1에 오면 그대로 되살린다. 2시간이 지나면 버린다.
import type { SajuResult } from "@/lib/saju";

const KEY = "saju:newYearRetry";
const TTL_MS = 2 * 60 * 60 * 1000;

export interface NewYearPending {
  result: SajuResult;
  name: string;
  savedAt: number;
}

export function saveNewYearPending(result: SajuResult, name: string): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ result, name, savedAt: Date.now() } satisfies NewYearPending));
  } catch {
    // 저장이 막힌 브라우저(사생활 보호 모드 등)면 다시 입력하면 된다 — 결제 흐름은 막지 않는다.
  }
}

export function loadNewYearPending(now = Date.now()): NewYearPending | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as NewYearPending;
    if (!data?.result || typeof data.savedAt !== "number" || now - data.savedAt > TTL_MS) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearNewYearPending(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // 무시
  }
}
