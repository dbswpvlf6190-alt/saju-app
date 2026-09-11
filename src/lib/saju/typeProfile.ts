import { CHEONGAN_KOR, CHEONGAN_WUXING, type WuXing } from "./ganzhi";

// 일간(日干) 10개를 캐주얼한 "유형" 이름으로 재포장한다. 명리학적 근거(자연물 비유)는
// content.ts의 DAY_MASTER_PROFILES와 동일하지만, 테스트 결과 카드에 쓰기 좋은 짧은
// 이름을 따로 둔다 — "갑목(甲木)"보다 "리더나무형"이 인스타에서 캡처·공유하기 쉽다.
const TYPE_NAME: Record<string, string> = {
  갑: "리더나무형",
  을: "유연풀잎형",
  병: "태양형",
  정: "촛불형",
  무: "큰산형",
  기: "기름진밭형",
  경: "원석형",
  신: "보석형",
  임: "큰강형",
  계: "이슬비형",
};

// 갑을병정무기경신임계 → 오행. ganzhi.ts의 CHEONGAN_WUXING(한자 키)를 한글 키로
// 변환해서 쓴다 — 오행 매핑의 단일 출처를 유지하기 위함이다.
const GAN_WUXING_KOR: Record<string, WuXing> = Object.fromEntries(
  Object.entries(CHEONGAN_KOR).map(([hanja, kor]) => [kor, CHEONGAN_WUXING[hanja]]),
);

// 오행 상생(내가 힘을 받는 오행 → 내가 힘을 주는 오행) 관계를 "잘 맞는 기운"으로,
// 상극(나를 억누르는 오행) 관계를 "묘한 긴장감이 도는 기운"으로 가볍게 풀어 쓴다.
const SYNERGY_NOTE: Record<WuXing, string> = {
  목: "물(水)처럼 나를 받쳐주는 사람이나 화(火)처럼 함께 타오르는 사람과 시너지가 좋아요.",
  화: "나무(木)처럼 든든히 밀어주는 사람이나 토(土)처럼 내 에너지를 잘 받아주는 사람과 잘 맞아요.",
  토: "화(火)처럼 나를 채워주는 사람이나 금(金)처럼 내가 키워주는 사람과 안정적인 궁합이에요.",
  금: "토(土)처럼 나를 다져주는 사람이나 수(水)처럼 내가 흘려보내는 사람과 합이 좋아요.",
  수: "금(金)처럼 나를 채워주는 사람이나 목(木)처럼 내가 뻗어나가게 돕는 사람과 잘 통해요.",
};

const TENSION_NOTE: Record<WuXing, string> = {
  목: "금(金)처럼 딱 부러지는 유형과는 묘하게 긴장감이 흐를 수 있어요.",
  화: "수(水)처럼 차분히 가라앉히는 유형과는 티키타카가 필요할 수 있어요.",
  토: "목(木)처럼 계속 파고드는 유형과는 은근한 밀당이 생길 수 있어요.",
  금: "화(火)처럼 뜨겁게 몰아붙이는 유형과는 신경전이 붙을 수 있어요.",
  수: "토(土)처럼 앞을 막아서는 유형과는 답답함을 느낄 수 있어요.",
};

export interface TypeProfile {
  typeName: string;
  synergyNote: string;
  tensionNote: string;
}

export function getTypeProfile(dayGanKor: string): TypeProfile {
  const typeName = TYPE_NAME[dayGanKor];
  const wuxing = GAN_WUXING_KOR[dayGanKor];
  if (!typeName || !wuxing) {
    throw new Error(`알 수 없는 일간: ${dayGanKor}`);
  }
  return {
    typeName,
    synergyNote: SYNERGY_NOTE[wuxing],
    tensionNote: TENSION_NOTE[wuxing],
  };
}
