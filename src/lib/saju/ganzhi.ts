// 천간(天干)/지지(地支)/오행(五行) 한자 -> 한글 매핑
// lunar-typescript가 반환하는 값은 한자이며, 한중 공통 간지 체계이므로
// 한국 사주 명리학에서 쓰는 한자와 동일하다. 여기서는 한글 독음만 매핑한다.

export type WuXing = "목" | "화" | "토" | "금" | "수";

export const CHEONGAN_KOR: Record<string, string> = {
  甲: "갑",
  乙: "을",
  丙: "병",
  丁: "정",
  戊: "무",
  己: "기",
  庚: "경",
  辛: "신",
  壬: "임",
  癸: "계",
};

export const JIJI_KOR: Record<string, string> = {
  子: "자",
  丑: "축",
  寅: "인",
  卯: "묘",
  辰: "진",
  巳: "사",
  午: "오",
  未: "미",
  申: "신",
  酉: "유",
  戌: "술",
  亥: "해",
};

export const CHEONGAN_WUXING: Record<string, WuXing> = {
  甲: "목",
  乙: "목",
  丙: "화",
  丁: "화",
  戊: "토",
  己: "토",
  庚: "금",
  辛: "금",
  壬: "수",
  癸: "수",
};

export const JIJI_WUXING: Record<string, WuXing> = {
  寅: "목",
  卯: "목",
  巳: "화",
  午: "화",
  辰: "토",
  戌: "토",
  丑: "토",
  未: "토",
  申: "금",
  酉: "금",
  亥: "수",
  子: "수",
};

const WUXING_HANJA_TO_KOR: Record<string, WuXing> = {
  木: "목",
  火: "화",
  土: "토",
  金: "금",
  水: "수",
};

/** lunar-typescript의 getYearWuXing() 등이 반환하는 "金火" 같은 2글자 오행 한자 문자열을 [간오행, 지오행]으로 변환 */
export function splitWuxingPair(wuxingHanja: string): [WuXing, WuXing] {
  const chars = Array.from(wuxingHanja);
  const gan = WUXING_HANJA_TO_KOR[chars[0]];
  const zhi = WUXING_HANJA_TO_KOR[chars[1]];
  if (!gan || !zhi) {
    throw new Error(`알 수 없는 오행 표기: ${wuxingHanja}`);
  }
  return [gan, zhi];
}

export function ganToKor(hanja: string): string {
  const kor = CHEONGAN_KOR[hanja];
  if (!kor) throw new Error(`알 수 없는 천간: ${hanja}`);
  return kor;
}

export function zhiToKor(hanja: string): string {
  const kor = JIJI_KOR[hanja];
  if (!kor) throw new Error(`알 수 없는 지지: ${hanja}`);
  return kor;
}

/** "庚午" 같은 간지 한자 2글자를 "경오"로 변환 */
export function ganZhiToKor(ganZhiHanja: string): string {
  const chars = Array.from(ganZhiHanja);
  return ganToKor(chars[0]) + zhiToKor(chars[1]);
}
