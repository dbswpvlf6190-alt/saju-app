"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, signAdminToken, verifyAdminPassword } from "@/lib/admin/auth";
import { rateLimitByIdentifier } from "@/lib/security/rateLimit";

export interface LoginState {
  error: string | null;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { ok } = rateLimitByIdentifier(ip, "admin:login", { limit: 5, windowMs: 5 * 60_000 });
  if (!ok) {
    return { error: "시도가 너무 많습니다. 5분 후 다시 시도해 주세요." };
  }

  const password = String(formData.get("password") ?? "");

  if (!process.env.ADMIN_PASSWORD) {
    return { error: "서버에 ADMIN_PASSWORD가 설정되어 있지 않습니다." };
  }
  if (!verifyAdminPassword(password)) {
    return { error: "비밀번호가 올바르지 않습니다." };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, await signAdminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  redirect("/admin");
}
