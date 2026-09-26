"use client";

import { useState } from "react";
import {
  DEFAULT_PERSON_VALUES,
  PersonBirthFields,
  isPersonComplete,
  personToSajuInput,
  type PersonFormValues,
} from "./PersonBirthFields";

/** 궁합 링크를 받은 사람이 자기 정보를 넣는 화면. 넣으면 보낸 사람도 같은 결과를 본다는 걸
 * 제출 전에 분명히 알린다(본인 생년월일시 자체는 보낸 사람에게 보이지 않는다). */
export function CompatInviteeForm({
  inviterName,
  submitting,
  errorMessage,
  onSubmit,
}: {
  inviterName: string;
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: { partnerName: string; partnerInput: ReturnType<typeof personToSajuInput> }) => void;
}) {
  const [me, setMe] = useState<PersonFormValues>({ ...DEFAULT_PERSON_VALUES, gender: "male" });
  const canSubmit = isPersonComplete(me);
  const sender = inviterName ? `${inviterName}님이` : "친구가";
  const senderShort = inviterName ? `${inviterName}님` : "보낸 분";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ partnerName: me.name.trim(), partnerInput: personToSajuInput(me) });
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-3xl">💌</span>
        <h2 className="font-serif text-2xl text-foreground">{sender} 궁합을 보자고 했어요</h2>
        <p className="text-sm text-foreground-muted">내 생년월일만 넣으면 두 사람 궁합이 바로 나와요.</p>
      </div>

      <PersonBirthFields
        idPrefix="invitee"
        title="나의 정보"
        nameOptionalLabel={`내 이름 (선택, ${senderShort}에게 보여요)`}
        namePlaceholder={`${senderShort}에게 보여요 (예: 준호)`}
        value={me}
        onChange={setMe}
      />

      <p className="rounded-xl border border-rose-300/40 bg-rose-300/10 px-3 py-2.5 text-xs leading-relaxed text-foreground">
        입력하면 <strong>{senderShort}도 같은 궁합 결과</strong>를 보게 돼요. 내 생년월일시 자체는 {senderShort}에게
        보이지 않아요.
      </p>

      {errorMessage && (
        <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !canSubmit}
        className="rounded-xl bg-accent-gold px-4 py-3.5 text-center text-base font-semibold text-[#1a1430] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "궁합을 분석하는 중..." : canSubmit ? "❤️ 궁합 결과 보기" : "내 생년월일시를 선택해주세요"}
      </button>
    </form>
  );
}
