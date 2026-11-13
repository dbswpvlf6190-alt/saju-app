// 웹 결제창(PortOne + KG이니시스)을 띄우기 전에 브라우저 환경을 보고 입력 칸·안내 문구를 정한다(2026-11-12).
// 11/12 네이버 앱으로 들어온 첫 신년운세 손님이 이름·이메일·휴대폰 입력에서 한 번 막히고, 결제창에서 실패했다.

/**
 * KG이니시스는 모바일 결제창이면 구매자 이름만 필수이고, PC 결제창이면 이름·휴대폰·이메일이 모두 필수다
 * (PortOne V2 이니시스 연동 가이드: "PC 결제의 경우 필수로 입력해야 합니다. (모바일인 경우에는 optional)").
 * 휴대폰으로 확실히 보이는 경우에만 칸을 줄이고, 태블릿·애매한 기기는 PC 기준으로 다 받는다(빠뜨리면 결제창이 거절된다).
 */
export function needsFullContact(userAgent: string): boolean {
  const ua = userAgent || "";
  const phone = /iPhone|iPod/i.test(ua) || (/Android/i.test(ua) && /Mobile/i.test(ua));
  return !phone;
}

export type InAppBrowser = "naver" | "kakao" | "instagram" | "threads" | "facebook" | null;

/** 앱 안의 브라우저(웹뷰)는 카드사 앱 호출이 막혀 결제가 실패하는 일이 있어, 실패 시 다른 브라우저 안내를 보여준다. */
export function detectInAppBrowser(userAgent: string): InAppBrowser {
  const ua = userAgent || "";
  if (/NAVER\(inapp/i.test(ua)) return "naver";
  if (/KAKAOTALK/i.test(ua)) return "kakao";
  if (/Instagram/i.test(ua)) return "instagram";
  if (/Barcelona/i.test(ua)) return "threads";
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return "facebook";
  return null;
}

const IN_APP_NAME: Record<Exclude<InAppBrowser, null>, string> = {
  naver: "네이버 앱",
  kakao: "카카오톡",
  instagram: "인스타그램",
  threads: "스레드",
  facebook: "페이스북",
};

/** 앱 안 브라우저일 때 결제가 안 되면 보여줄 한 줄 안내. 앱 밖이면 null. */
export function inAppHint(app: InAppBrowser): string | null {
  if (!app) return null;
  return `${IN_APP_NAME[app]} 안에서는 결제창이 열리지 않을 때가 있어요. 화면 오른쪽 위나 아래의 메뉴(⋮ 또는 ···)에서 '다른 브라우저로 열기'를 누른 뒤 다시 결제해 주세요.`;
}

/**
 * 결제 버튼을 누르기 '전'에 보여줄 안내. 11/12 네이버 앱 손님 3명이 모두 결제창에서 끝내지 못해(취소 1·창만 열고 이탈 2),
 * 실패 뒤에만 나오던 안내를 미리 보여준다. 앱 밖이면 null.
 */
export function inAppPrepayHint(app: InAppBrowser): string | null {
  if (!app) return null;
  return `${IN_APP_NAME[app]}에서는 결제창이 멈추거나 카드·카카오페이 앱으로 넘어가지 않을 때가 있어요. 그럴 땐 메뉴(⋮ 또는 ···)의 '다른 브라우저로 열기'에서 결제하면 잘 돼요.`;
}

/** 휴대폰 번호는 사람마다 010-1234-5678, 010 1234 5678처럼 다르게 쓴다 — 숫자만 남긴다. */
export function normalizePhone(raw: string): string {
  return (raw || "").replace(/\D/g, "");
}

export function isValidPhone(raw: string): boolean {
  return /^01[0-9]{8,9}$/.test(normalizePhone(raw));
}

export function isValidEmail(raw: string): boolean {
  return /^\S+@\S+\.\S+$/.test((raw || "").trim());
}

/**
 * 결제창이 돌려준 오류(코드·메시지)를 손님이 이해할 문장으로 바꾼다. 원문은 기록용으로만 남긴다.
 * 취소는 실패가 아니라 손님 선택이라 탓하지 않는 말투로, 그 밖에는 다른 결제수단·다른 브라우저를 안내한다.
 */
export function friendlyPaymentError(message: string | null | undefined): string {
  const m = message ?? "";
  if (/취소|cancel/i.test(m)) return "결제를 취소하셨어요. 아래 버튼으로 언제든 다시 결제할 수 있어요.";
  if (/한도|잔액|limit|balance/i.test(m)) return "카드 한도나 잔액 문제로 결제가 안 됐어요. 다른 카드나 카카오페이로 다시 시도해 주세요.";
  return "결제가 완료되지 않았어요. 다른 카드나 카카오페이로 다시 시도해 주세요.";
}

/** 기록용으로 결제창 메시지를 짧게 자른다(개인정보가 들어오지 않는 PG 메시지지만 길이는 제한). */
export function clipForLog(message: string | null | undefined, max = 120): string | undefined {
  if (!message) return undefined;
  return message.slice(0, max);
}
