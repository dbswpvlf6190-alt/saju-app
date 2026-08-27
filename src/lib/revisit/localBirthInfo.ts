import type { SajuInput } from "@/lib/saju/types";

const KEY = "saju:lastBirthInfo";

export interface SavedBirthInfo {
  name: string;
  birthInput: SajuInput;
  savedAt: string;
}

/** 브라우저 LocalStorage에만 저장한다 — 서버로 전송하거나 DB에 저장하지 않는다.
 * "다시 보기" 편의 기능일 뿐이라 다른 기기/브라우저에서는 남지 않는다(개인정보처리방침에
 * 이 저장 방식을 명시해 실제 구현과 문서가 일치하도록 한다). */
export function saveLastBirthInfo(info: Omit<SavedBirthInfo, "savedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const payload: SavedBirthInfo = { ...info, savedAt: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // 저장소 접근이 막힌 환경(프라이빗 모드 등)에서는 조용히 무시한다.
  }
}

export function loadLastBirthInfo(): SavedBirthInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SavedBirthInfo;
  } catch {
    return null;
  }
}

export function clearLastBirthInfo(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
