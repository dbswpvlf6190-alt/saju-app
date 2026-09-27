"use client";

import { useState } from "react";
import {
  DEFAULT_PERSON_VALUES,
  PersonBirthFields,
  isPersonComplete,
  personToSajuInput,
  type PersonFormValues,
} from "./PersonBirthFields";

export interface CompatibilitySubmitValues {
  selfName: string;
  partnerName: string;
  selfInput: ReturnType<typeof personToSajuInput>;
  partnerInput: ReturnType<typeof personToSajuInput>;
}

export interface CompatibilityInviteValues {
  selfName: string;
  selfInput: ReturnType<typeof personToSajuInput>;
}

type PartnerMode = "link" | "direct";

export function CompatibilityForm({
  onSubmit,
  onCreateInvite,
  submitting,
  errorMessage,
}: {
  onSubmit: (values: CompatibilitySubmitValues) => void;
  /** "상대에게 링크 보내기"를 고른 경우. 내 정보만 넘긴다. */
  onCreateInvite: (values: CompatibilityInviteValues) => void;
  submitting: boolean;
  errorMessage: string | null;
}) {
  const [self, setSelf] = useState<PersonFormValues>(DEFAULT_PERSON_VALUES);
  const [partner, setPartner] = useState<PersonFormValues>({ ...DEFAULT_PERSON_VALUES, gender: "male" });
  // 상대 생시를 몰라 포기하거나 상대 정보를 대신 넣는 대신, 상대가 직접 넣게 하는 쪽을 기본으로 둔다.
  const [partnerMode, setPartnerMode] = useState<PartnerMode>("link");
  const canSubmit = isPersonComplete(self) && (partnerMode === "link" || isPersonComplete(partner));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (partnerMode === "link") {
      onCreateInvite({ selfName: self.name.trim(), selfInput: personToSajuInput(self) });
      return;
    }
    onSubmit({
      selfName: self.name.trim(),
      partnerName: partner.name.trim(),
      selfInput: personToSajuInput(self),
      partnerInput: personToSajuInput(partner),
    });
  }

  const modeButton = (mode: PartnerMode, title: string, desc: string, recommended = false) => (
    <button
      type="button"
      onClick={() => setPartnerMode(mode)}
      aria-pressed={partnerMode === mode}
      className={`flex flex-col gap-0.5 rounded-xl border px-4 py-3 text-left transition-colors ${
        partnerMode === mode
          ? "border-accent-gold bg-accent-gold/10"
          : "border-border-subtle bg-background-card/70 hover:border-accent-gold/60"
      }`}
    >
      <span className="text-sm font-medium text-foreground">
        {title}
        {recommended && (
          <span className="ml-1.5 rounded-full bg-accent-gold-soft px-1.5 py-0.5 align-middle text-[10px] font-bold text-[#1a1430]">
            추천
          </span>
        )}
      </span>
      <span className="text-xs leading-relaxed text-foreground-muted">{desc}</span>
    </button>
  );

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-6">
      <PersonBirthFields
        idPrefix="self"
        title="나의 정보"
        nameOptionalLabel={partnerMode === "link" ? "내 이름 (선택, 상대에게 보여요)" : "내 이름 (선택)"}
        namePlaceholder={partnerMode === "link" ? "링크를 받은 상대에게 보여요 (예: 민지)" : undefined}
        value={self}
        onChange={setSelf}
      />

      <div className="flex flex-col gap-2">
        <span className="px-1 text-sm font-medium text-foreground">상대방 정보</span>
        {modeButton(
          "link",
          "상대에게 링크 보내기",
          "상대가 자기 생년월일을 직접 넣어요. 생시를 몰라도 괜찮고, 넣는 순간 둘 다 결과를 봐요.",
          true,
        )}
        {modeButton("direct", "내가 직접 입력하기", "상대 정보를 알고 있다면 바로 결과를 볼 수 있어요.")}
      </div>

      {partnerMode === "direct" && (
        <PersonBirthFields
          idPrefix="partner"
          title="상대방 정보"
          nameOptionalLabel="상대방 이름 (선택)"
          value={partner}
          onChange={setPartner}
        />
      )}

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
        {submitting
          ? partnerMode === "link"
            ? "링크를 만드는 중..."
            : "궁합을 분석하는 중..."
          : !canSubmit
            ? partnerMode === "link"
              ? "내 생년월일시를 선택해주세요"
              : "두 사람의 생년월일시를 선택해주세요"
            : partnerMode === "link"
              ? "💌 궁합 링크 만들기"
              : "❤️ 무료로 궁합 보기"}
      </button>
    </form>
  );
}
