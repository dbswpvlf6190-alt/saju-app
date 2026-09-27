export const REFERRAL_TARGET = 3;

/** 공유 링크에 붙는 초대 코드 파라미터. ?ref=는 유입 경로 통계(share_kakao 등)에 이미 쓰고 있어 분리했다. */
export const INVITE_PARAM = "invite";

/** 친구가 초대 링크로 들어온 뒤 폼을 거쳐 결과를 볼 때까지 초대 코드를 들고 있는 곳. */
export const INVITE_STORAGE_KEY = "saju:invite";

export interface ReferralStatus {
  code: string;
  count: number;
  target: number;
  coupon: { code: string; expiresAt: string; used: boolean } | null;
}
