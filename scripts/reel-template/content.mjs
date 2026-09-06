// 사주랩 릴스 템플릿 시스템 — 콘텐츠 데이터
// 실제 데이터는 reels.json에 있다(2026-09-06, 자동 채우기 스크립트가 JSON을 프로그램으로
// 읽고 쓰기 쉽게 하려고 분리함 — .mjs 안에 리터럴로 박아두면 자동화가 문자열을 짜맞춰야 해서 위험함).
// 새 릴스를 추가하려면 reels.json에 항목을 추가하고 build.mjs를 다시 실행하면 됩니다.
// 각 항목은 R25에서 검증된 5장면 구조(HOOK → INFO → CURIOSITY → 실제 앱 화면 → CTA)를 따릅니다.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REELS_JSON_PATH = fileURLToPath(new URL("./reels.json", import.meta.url));

export const CTA_HEADLINE = "내 사주는 어떨까?";
export const CTA_BUTTON = "프로필 링크에서 무료 확인 🔮";
// 화면 문구(CTA_BUTTON)엔 이모지가 있어서 나레이션에 그대로 쓰면 어색하게 읽힘 — 음성 전용 문구를 따로 둔다.
export const CTA_NARRATION = "내 사주는 어떨까요? 프로필 링크에서 무료로 확인해보세요.";

export const REELS = JSON.parse(readFileSync(REELS_JSON_PATH, "utf-8"));

// 업로드 순서(order)대로 정렬해 파일명에 사용
export const REELS_IN_UPLOAD_ORDER = [...REELS].sort((a, b) => a.order - b.order);
