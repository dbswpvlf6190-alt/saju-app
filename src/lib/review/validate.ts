// 후기 등록 시 서버에서 최소한으로 걸러야 하는 것들: 평점 범위, 길이, 개인정보 노출,
// 광고성 문구, 대표적인 욕설. 완벽한 필터는 아니고 명백한 케이스만 막는 1차 방어선이다.
const MIN_LENGTH = 5;
const MAX_LENGTH = 500;

const PHONE_PATTERN = /01[0-9][-.\s]?\d{3,4}[-.\s]?\d{4}/;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const URL_PATTERN = /https?:\/\/|www\./i;
const AD_KEYWORDS = ["문의", "카톡", "카카오톡", "텔레그램", "라인추가", "открытая", "대출", "홍보", "제휴", "이벤트 참여"];
const PROFANITY_KEYWORDS = ["씨발", "개새끼", "병신", "지랄", "좆", "미친놈", "미친년", "닥쳐"];

export interface ReviewInput {
  rating: number;
  content: string;
}

export interface ReviewValidationResult {
  ok: boolean;
  error?: string;
  content?: string;
}

export function validateReview(input: { rating: unknown; content: unknown }): ReviewValidationResult {
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "별점은 1~5 사이의 정수여야 합니다." };
  }

  if (typeof input.content !== "string") {
    return { ok: false, error: "후기 내용을 입력해 주세요." };
  }

  const content = input.content.trim();
  if (content.length < MIN_LENGTH) {
    return { ok: false, error: `후기는 최소 ${MIN_LENGTH}자 이상 작성해 주세요.` };
  }
  if (content.length > MAX_LENGTH) {
    return { ok: false, error: `후기는 ${MAX_LENGTH}자를 넘을 수 없습니다.` };
  }
  if (PHONE_PATTERN.test(content) || EMAIL_PATTERN.test(content)) {
    return { ok: false, error: "전화번호나 이메일 같은 개인정보는 후기에 남길 수 없습니다." };
  }
  if (URL_PATTERN.test(content)) {
    return { ok: false, error: "링크가 포함된 후기는 등록할 수 없습니다." };
  }
  if (AD_KEYWORDS.some((kw) => content.includes(kw))) {
    return { ok: false, error: "광고성 문구가 포함된 후기는 등록할 수 없습니다." };
  }
  if (PROFANITY_KEYWORDS.some((kw) => content.includes(kw))) {
    return { ok: false, error: "부적절한 표현이 포함되어 있어 등록할 수 없습니다." };
  }

  return { ok: true, content };
}
