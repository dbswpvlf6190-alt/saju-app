import { randomBytes } from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { calculateSaju, type SajuInput } from "@/lib/saju";
import { calculateFreeCompatibility } from "@/lib/saju/compatibility";
import { hmacHex, timingSafeEqualString } from "@/lib/security/hmac";
import { INVITE_NAME_MAX, type CompatInviteResult } from "./shared";

export const COMPAT_KEY_COOKIE = "saju_compat_key";
const COMPAT_KEY_MAX_AGE = 60 * 60 * 24 * 30;

// 새 환경변수를 늘리지 않고 운영에 필수로 설정된 ORDER_ACCESS_SECRET에 용도 접두사를 붙여 쓴다
// (친구 초대 보상과 같은 방식) — 주문 접근 토큰·초대 쿠키와 서명이 겹치지 않는다.
function getSecret(): string {
  const secret = process.env.ORDER_ACCESS_SECRET;
  if (!secret) throw new Error("ORDER_ACCESS_SECRET 환경변수가 설정되지 않았습니다.");
  return secret;
}

async function signKey(key: string): Promise<string> {
  return `${key}.${await hmacHex(getSecret(), `compat-key:${key}`)}`;
}

async function verifyKey(value: string | undefined): Promise<string | null> {
  if (!value || !process.env.ORDER_ACCESS_SECRET) return null;
  const dot = value.lastIndexOf(".");
  if (dot === -1) return null;
  const key = value.slice(0, dot);
  const expected = await hmacHex(getSecret(), `compat-key:${key}`);
  return timingSafeEqualString(value.slice(dot + 1), expected) ? key : null;
}

/** 이 브라우저의 궁합 링크 키. 보낸 사람·받은 사람을 가려내는 데만 쓰며 개인정보는 담지 않는다. */
export async function readBrowserKey(req: NextRequest): Promise<string | null> {
  return verifyKey(req.cookies.get(COMPAT_KEY_COOKIE)?.value);
}

export async function ensureBrowserKey(req: NextRequest): Promise<{ key: string; isNew: boolean }> {
  const existing = await readBrowserKey(req);
  if (existing) return { key: existing, isNew: false };
  return { key: randomBytes(12).toString("base64url"), isNew: true };
}

export async function setBrowserKeyCookie(res: NextResponse, key: string): Promise<void> {
  res.cookies.set(COMPAT_KEY_COOKIE, await signKey(key), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COMPAT_KEY_MAX_AGE,
  });
}

export function generateInviteCode(): string {
  return randomBytes(6).toString("base64url");
}

export function sanitizeName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const trimmed = name.trim().slice(0, INVITE_NAME_MAX);
  return trimmed || null;
}

export function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function buildInviteResult(invite: {
  inviterInputJson: string;
  partnerInputJson: string;
  inviterName: string | null;
  partnerName: string | null;
}): CompatInviteResult {
  const selfResult = calculateSaju(JSON.parse(invite.inviterInputJson) as SajuInput);
  const partnerResult = calculateSaju(JSON.parse(invite.partnerInputJson) as SajuInput);
  return {
    selfResult,
    partnerResult,
    free: calculateFreeCompatibility(selfResult, partnerResult),
    inviterName: invite.inviterName ?? "",
    partnerName: invite.partnerName ?? "",
  };
}
