import type { SajuResult } from "@/lib/saju/types";
import type { FreeCompatibility } from "@/lib/saju/compatibility";

export const COMPAT_INVITE_PARAM = "pair";
export const INVITE_TTL_DAYS = 7;
export const RESULT_TTL_DAYS = 7;
export const INVITE_NAME_MAX = 20;

export type InviteViewerRole = "inviter" | "partner" | "guest";

export interface CompatInviteResult {
  /** 두 사람 모두 같은 결과를 보도록 항상 보낸 사람이 self, 받은 사람이 partner다. */
  selfResult: SajuResult;
  partnerResult: SajuResult;
  free: FreeCompatibility;
  inviterName: string;
  partnerName: string;
}

export type CompatInviteView =
  | { status: "pending"; role: InviteViewerRole; inviterName: string; expiresAt: string }
  | { status: "completed"; role: "inviter" | "partner"; result: CompatInviteResult; expiresAt: string }
  /** 다른 사람이 이미 입력해서 닫힌 링크를 제3자가 연 경우. 결과는 보여주지 않는다. */
  | { status: "used"; inviterName: string }
  | { status: "expired" };

export interface MyCompatInvite {
  code: string;
  status: "pending" | "completed";
  partnerName: string;
  expiresAt: string;
  notifyRequested: boolean;
}
