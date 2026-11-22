import { describe, expect, it } from "vitest";
import {
  detectInAppBrowser,
  friendlyPaymentError,
  inAppHint,
  inAppPrepayHint,
  kakaoPayAvailable,
  payChoices,
  portOnePayMethod,
  resolvePayChoice,
  EASY_PAY_ON_PC,
  isValidEmail,
  isValidPhone,
  needsFullContact,
  normalizePhone,
} from "../checkoutEnv";
import { parseNewYearReturn } from "@/lib/newYear/returnParams";

const NAVER_ANDROID =
  "Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.100 Mobile Safari/537.36 NAVER(inapp; search; 2000; 12.10.1)";
const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const WINDOWS_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const ANDROID_TABLET = "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const IPAD_DESKTOP_MODE =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15";

describe("결제 입력 칸(이니시스: 모바일은 이름만, PC는 이름·휴대폰·이메일)", () => {
  it("휴대폰(네이버 앱·아이폰)은 휴대폰·이메일을 묻지 않는다", () => {
    expect(needsFullContact(NAVER_ANDROID)).toBe(false);
    expect(needsFullContact(IPHONE_SAFARI)).toBe(false);
  });

  it("PC·태블릿·알 수 없는 기기는 다 받는다(빠뜨리면 PC 결제창이 거절)", () => {
    expect(needsFullContact(WINDOWS_CHROME)).toBe(true);
    expect(needsFullContact(ANDROID_TABLET)).toBe(true);
    expect(needsFullContact(IPAD_DESKTOP_MODE)).toBe(true);
    expect(needsFullContact("")).toBe(true);
  });
});

describe("앱 안 브라우저 안내", () => {
  it("네이버 앱을 알아보고 다른 브라우저로 여는 법을 안내한다", () => {
    expect(detectInAppBrowser(NAVER_ANDROID)).toBe("naver");
    expect(inAppHint("naver")).toContain("네이버 앱");
    expect(inAppHint("naver")).toContain("다른 브라우저로 열기");
  });

  it("일반 브라우저면 안내하지 않는다", () => {
    expect(detectInAppBrowser(IPHONE_SAFARI)).toBeNull();
    expect(inAppHint(null)).toBeNull();
    expect(inAppPrepayHint(null)).toBeNull();
  });

  it("결제 버튼 전에 미리 다른 브라우저 안내를 보여준다", () => {
    expect(inAppPrepayHint("naver")).toContain("네이버 앱");
    expect(inAppPrepayHint("naver")).toContain("다른 브라우저로 열기");
  });
});

describe("입력값 정리", () => {
  it("휴대폰 번호는 띄어쓰기·하이픈이 있어도 받는다", () => {
    expect(normalizePhone("010-1234 5678")).toBe("01012345678");
    expect(isValidPhone("010 1234 5678")).toBe(true);
    expect(isValidPhone("02-123-4567")).toBe(false);
  });

  it("이메일 앞뒤 공백은 봐준다", () => {
    expect(isValidEmail(" hong@naver.com ")).toBe(true);
    expect(isValidEmail("hong@naver")).toBe(false);
  });
});

describe("결제 실패 문구", () => {
  it("취소는 탓하지 않고 다시 할 수 있다고 알린다", () => {
    expect(friendlyPaymentError("[V2] 사용자가 결제를 취소하셨습니다")).toContain("다시 결제");
  });

  it("그 밖의 실패는 다른 카드·카카오페이를 권한다", () => {
    expect(friendlyPaymentError("카드 인증 실패")).toContain("카카오페이");
    expect(friendlyPaymentError(null)).toContain("카카오페이");
  });
});

describe("모바일 결제창 복귀 주소 해석", () => {
  const id = "2c6f1a81-9894-472c-acb0-81dde3200245";

  it("실패면 코드·PG 코드·메시지를 함께 읽는다", () => {
    const r = parseNewYearReturn(`?paymentId=${id}&code=FAILURE_TYPE_PG&message=%EC%B7%A8%EC%86%8C&pgCode=V801&pgMessage=user`);
    expect(r).toMatchObject({ paymentId: id, failed: true, code: "FAILURE_TYPE_PG", pgCode: "V801" });
    expect(r.message).toBe("취소 / user");
  });

  it("성공이면 주문번호만 있다", () => {
    expect(parseNewYearReturn(`?paymentId=${id}`)).toMatchObject({ paymentId: id, failed: false, code: null, message: null });
  });

  it("이상한 값은 버린다", () => {
    expect(parseNewYearReturn("?paymentId=../../x&code=<script>")).toMatchObject({ paymentId: null, failed: true, code: null });
  });
});

describe("결제 수단 버튼", () => {
  const PC = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36";
  it("휴대폰에서는 카드·네이버페이·카카오페이·토스페이 순서", () => {
    expect(payChoices(IPHONE_SAFARI).map((c) => c.value)).toEqual(["CARD", "NAVERPAY", "KAKAOPAY", "TOSSPAY"]);
    expect(kakaoPayAvailable(NAVER_ANDROID)).toBe(true);
  });
  it("PC는 EASY_PAY_ON_PC 스위치를 따른다", () => {
    expect(payChoices(PC).length).toBe(EASY_PAY_ON_PC ? 4 : 1);
    expect(kakaoPayAvailable(PC)).toBe(EASY_PAY_ON_PC);
  });
  it("예전 저장값 EASY_PAY는 카카오페이, 모르는 값은 카드", () => {
    expect(resolvePayChoice("EASY_PAY", IPHONE_SAFARI)).toBe("KAKAOPAY");
    expect(resolvePayChoice("BITCOIN", IPHONE_SAFARI)).toBe("CARD");
    expect(resolvePayChoice(null, IPHONE_SAFARI)).toBe("CARD");
  });
  it("PortOne에는 간편결제 제공자를 그대로 넘긴다", () => {
    expect(portOnePayMethod("CARD")).toEqual({ payMethod: "CARD" });
    expect(portOnePayMethod("NAVERPAY")).toEqual({ payMethod: "EASY_PAY", easyPay: { easyPayProvider: "NAVERPAY" } });
    expect(portOnePayMethod("TOSSPAY")).toEqual({ payMethod: "EASY_PAY", easyPay: { easyPayProvider: "TOSSPAY" } });
  });
});
