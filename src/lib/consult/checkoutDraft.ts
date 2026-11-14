// AI 상담 결제 화면(/consult)은 모바일 결제창(리디렉션)에서 실패·취소하고 돌아오면 고른 상품·생년월일·이름이 모두
// 사라져 처음부터 다시 넣어야 했다(2026-11-12). 결제창을 띄우기 직전에 입력값을 이 탭(sessionStorage)에만 잠깐 저장했다가,
// 실패로 돌아오면 그대로 채워 준다. 2시간이 지나면 버린다. 동의 체크는 결제마다 다시 받는다.
import type { PersonFormValues } from "@/components/saju/PersonBirthFields";
import type { ConsultProductType } from "@/lib/consult/plans";

const KEY = "saju:consultCheckoutDraft";
const TTL_MS = 2 * 60 * 60 * 1000;

export interface ConsultCheckoutDraft {
  product: ConsultProductType;
  forGift: boolean;
  person: PersonFormValues;
  giftFrom: string;
  fullName: string;
  payMethod: "CARD" | "EASY_PAY";
  savedAt: number;
}

export function saveConsultDraft(draft: Omit<ConsultCheckoutDraft, "savedAt">): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // 저장이 막힌 브라우저면 다시 입력하면 된다 — 결제 흐름은 막지 않는다.
  }
}

export function loadConsultDraft(now = Date.now()): ConsultCheckoutDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as ConsultCheckoutDraft;
    if (!d?.person || typeof d.savedAt !== "number" || now - d.savedAt > TTL_MS) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

export function clearConsultDraft(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // 무시
  }
}
