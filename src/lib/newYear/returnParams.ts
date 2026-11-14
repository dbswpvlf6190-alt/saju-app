// 모바일 결제창(리디렉션 방식)이 끝나고 /new-year/return으로 돌아올 때의 쿼리를 해석한다(2026-10-22).
// PortOne v2는 성공하면 paymentId만, 실패·취소하면 code(와 message, pgCode, pgMessage)를 함께 붙여 돌려준다.

export interface NewYearReturnParams {
  paymentId: string | null;
  /** 결제창에서 실패하거나 취소하고 돌아온 경우 */
  failed: boolean;
  message: string | null;
  /** 실패 원인 기록용(PortOne 오류 코드, PG사 코드). 화면에는 쓰지 않는다. */
  code: string | null;
  pgCode: string | null;
}

// 서버가 발급하는 주문번호(UUID 36자)만 받는다. 쿼리 값을 그대로 API 경로에 쓰므로 형식을 먼저 거른다.
const PAYMENT_ID_PATTERN = /^[0-9a-fA-F-]{36}$/;
const SHORT_CODE = /^[\w.-]{1,60}$/;

export function parseNewYearReturn(search: string): NewYearReturnParams {
  const params = new URLSearchParams(search);
  const rawId = params.get("paymentId");
  const paymentId = rawId && PAYMENT_ID_PATTERN.test(rawId) ? rawId : null;
  const failed = params.has("code");
  const message = [params.get("message"), params.get("pgMessage")].filter(Boolean).join(" / ") || null;
  const code = params.get("code");
  const pgCode = params.get("pgCode");
  return {
    paymentId,
    failed,
    message: message ? message.slice(0, 200) : null,
    code: code && SHORT_CODE.test(code) ? code : null,
    pgCode: pgCode && SHORT_CODE.test(pgCode) ? pgCode : null,
  };
}
