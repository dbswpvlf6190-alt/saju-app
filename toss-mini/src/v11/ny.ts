import { Analytics } from "@apps-in-toss/web-framework";

// v11 신년운세 공통(2026-10-26): 가격·문구 상수, 버튼 문구 A/B, 행동 기록.
// 가격은 토스 콘솔에 등록한 판매가와 같아야 한다(공급가 3,540원 → 판매가 3,894원, 10/23 등록).

/** 상품이 다루는 해. 서버 NEW_YEAR_REPORT_TARGET_YEAR와 같아야 한다(다음 시즌에는 둘을 함께 바꾼다). */
export const NY_YEAR = 2027;

/** 해가 바뀌면 "내년"이 "올해"가 된다(입춘 전 1~2월에도 화면 문구가 어색하지 않게). */
export function yearWord(year: number, now: Date = new Date()): "내년" | "올해" {
  const kstYear = new Date(now.getTime() + 9 * 3600 * 1000).getUTCFullYear();
  return year > kstYear ? "내년" : "올해";
}

export const NY_PRICE_KRW = Number(import.meta.env.VITE_NY_PRICE) || 3894;
export const NY_PRICE_LABEL = `${NY_PRICE_KRW.toLocaleString("ko-KR")}원`;

export type TeaserVariant = "A" | "B";
const KEY_VARIANT = "sajulab:ny:variant:v1";

/** 버튼 문구 A/B — 사람마다 처음 한 번 무작위로 정해 기기에 저장한다(같은 사람은 계속 같은 문구). 저장이 막히면 A. */
export function getVariant(): TeaserVariant {
  try {
    const saved = localStorage.getItem(KEY_VARIANT);
    if (saved === "A" || saved === "B") return saved;
    const v: TeaserVariant = Math.random() < 0.5 ? "A" : "B";
    localStorage.setItem(KEY_VARIANT, v);
    return v;
  } catch {
    return "A";
  }
}

/** 사용자 행동 기록(토스 콘솔 분석). 토스 밖이거나 미지원 버전이면 조용히 무시된다. */
export function nyTrack(name: string, params: Record<string, string | number | boolean> = {}) {
  try {
    void Analytics.log({ log_name: name, log_type: "event", params }).catch(() => {});
  } catch {
    /* 기록 실패는 화면에 영향 없게 무시 */
  }
}
