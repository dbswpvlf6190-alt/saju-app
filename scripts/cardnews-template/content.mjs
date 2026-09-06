// 사주랩 카드뉴스 콘텐츠 데이터. 각 세트는 표지 1장 + 내용 N장 + CTA 1장으로 구성한다.
// 실제 데이터는 cardsets.json에 있다(2026-09-06, 자동 채우기 스크립트가 JSON을 프로그램으로
// 읽고 쓰기 쉽게 하려고 분리함 — reel-template/content.mjs와 같은 이유).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CARDSETS_JSON_PATH = fileURLToPath(new URL("./cardsets.json", import.meta.url));

export const CTA_HEADLINE = "내 사주는 어떨까?";
export const CTA_BUTTON = "프로필 링크에서 무료 확인 🔮";

export const CARD_SETS = JSON.parse(readFileSync(CARDSETS_JSON_PATH, "utf-8"));

export const CARD_SETS_IN_ORDER = [...CARD_SETS].sort((a, b) => a.order - b.order);
