"use client";

import { useState } from "react";
import {
  DEFAULT_PERSON_VALUES,
  PersonBirthFields,
  personToSajuInput,
  type PersonFormValues,
} from "./PersonBirthFields";

export interface CompatibilitySubmitValues {
  selfName: string;
  partnerName: string;
  selfInput: ReturnType<typeof personToSajuInput>;
  partnerInput: ReturnType<typeof personToSajuInput>;
}

export function CompatibilityForm({
  onSubmit,
  submitting,
  errorMessage,
}: {
  onSubmit: (values: CompatibilitySubmitValues) => void;
  submitting: boolean;
  errorMessage: string | null;
}) {
  const [self, setSelf] = useState<PersonFormValues>(DEFAULT_PERSON_VALUES);
  const [partner, setPartner] = useState<PersonFormValues>({ ...DEFAULT_PERSON_VALUES, gender: "male" });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      selfName: self.name.trim(),
      partnerName: partner.name.trim(),
      selfInput: personToSajuInput(self),
      partnerInput: personToSajuInput(partner),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-6">
      <PersonBirthFields
        idPrefix="self"
        title="나의 정보"
        nameOptionalLabel="내 이름 (선택)"
        value={self}
        onChange={setSelf}
      />
      <PersonBirthFields
        idPrefix="partner"
        title="상대방 정보"
        nameOptionalLabel="상대방 이름 (선택)"
        value={partner}
        onChange={setPartner}
      />

      {errorMessage && (
        <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-xl bg-accent-gold px-4 py-3.5 text-center text-base font-semibold text-[#1a1430] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "궁합을 분석하는 중..." : "❤️ 무료로 궁합 보기"}
      </button>
    </form>
  );
}
