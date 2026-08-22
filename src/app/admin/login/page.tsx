"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const INITIAL_STATE: LoginState = { error: null };

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL_STATE);

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-5">
      <form action={formAction} className="flex w-full max-w-xs flex-col gap-4">
        <h1 className="text-center font-serif text-xl text-accent-gold-soft">관리자 로그인</h1>
        <input
          type="password"
          name="password"
          placeholder="비밀번호"
          autoFocus
          className="w-full rounded-xl border border-border-subtle bg-background-elevated px-3 py-2.5 text-foreground outline-none focus:border-accent-gold"
        />
        {state.error && <p className="text-sm text-red-300">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-accent-gold px-4 py-3 text-center text-sm font-semibold text-[#1a1430] disabled:opacity-50"
        >
          {pending ? "확인 중..." : "로그인"}
        </button>
      </form>
    </div>
  );
}
