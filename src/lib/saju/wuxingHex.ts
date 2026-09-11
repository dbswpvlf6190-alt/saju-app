import type { WuXing } from "./ganzhi";

/** next/og의 ImageResponse(Satori)는 CSS 커스텀 프로퍼티(var())를 지원하지 않아,
 * globals.css의 오행 색상과 동일한 값을 리터럴 hex로 별도 보관한다. 공유 이미지 라우트
 * (/api/og/story 등) 전용이며, 값은 globals.css --wuxing-* 변수와 항상 맞춰야 한다. */
export const WUXING_HEX: Record<WuXing, string> = {
  목: "#4caf6e",
  화: "#e2604f",
  토: "#d3a04a",
  금: "#cfc9b8",
  수: "#5b86d6",
};

// 공유 이미지의 배지 안에 큰 글자로 넣을 오행 한자. next/og(Satori)의 이모지 렌더링은
// 외부 CDN에서 트윔지 이미지를 매 요청마다 fetch해오는 방식이라 네트워크 지연·실패에
// 취약하다 — 이미 폰트에 포함된 한자를 쓰면 추가 네트워크 요청 없이 항상 렌더링된다.
export const WUXING_HANJA: Record<WuXing, string> = {
  목: "木",
  화: "火",
  토: "土",
  금: "金",
  수: "水",
};
