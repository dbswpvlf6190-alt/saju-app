"use client";

import { useState } from "react";
import {
  DEFAULT_PERSON_VALUES,
  isPersonComplete,
  personToSajuInput,
  PersonBirthFields,
  type PersonFormValues,
} from "@/components/saju/PersonBirthFields";

const SECTION_OPTIONS = [
  { value: "newYear", label: "2027 신년운세" },
  { value: "love", label: "연애운" },
  { value: "wealth", label: "재물운" },
  { value: "career", label: "직업운" },
  { value: "relationship", label: "인간관계운" },
  { value: "yearly", label: "올해의 흐름" },
] as const;

/** 결제 없이 AI 해석 콘텐츠를 그 자리에서 생성해서 품질을 확인하는 관리자 전용 도구.
 * Order·쿠폰 어느 것도 소모하지 않는다 — /api/admin/preview가 DB에 아무것도 남기지 않는다. */
export function AdminPreviewTool() {
  const [person, setPerson] = useState<PersonFormValues>(DEFAULT_PERSON_VALUES);
  const [section, setSection] = useState<(typeof SECTION_OPTIONS)[number]["value"]>("newYear");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);

  async function handleGenerate() {
    if (!isPersonComplete(person)) {
      setStatus("error");
      setErrorMessage("생년월일(그리고 시간을 안다면 시각)을 모두 입력해 주세요.");
      return;
    }
    setStatus("loading");
    setErrorMessage(null);
    setText(null);
    try {
      const res = await fetch("/api/admin/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthInput: personToSajuInput(person), section }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "생성에 실패했습니다.");
      setText(data.text);
      setStatus("idle");
    } catch (e) {
      setStatus("error");
      setErrorMessage(e instanceof Error ? e.message : "생성 중 오류가 발생했습니다.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PersonBirthFields
        idPrefix="admin-preview"
        title="테스트할 생년월일시"
        nameOptionalLabel="이름 (선택, 표시 안 됨)"
        value={person}
        onChange={setPerson}
      />

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="preview-section" className="text-sm text-foreground-muted">
          미리볼 항목
        </label>
        <select
          id="preview-section"
          value={section}
          onChange={(e) => setSection(e.target.value as typeof section)}
          className="rounded-lg border border-border-subtle bg-background-elevated px-3 py-1.5 text-sm text-foreground outline-none focus:border-accent-gold"
        >
          {SECTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={status === "loading"}
          className="rounded-lg border border-accent-gold px-3 py-1.5 text-sm font-medium text-accent-gold-soft transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {status === "loading" ? "생성 중..." : "결제 없이 미리보기 생성"}
        </button>
      </div>

      {errorMessage && <p className="text-sm text-red-300">{errorMessage}</p>}

      {text && (
        <div className="whitespace-pre-line rounded-2xl border border-border-subtle bg-background-card/70 p-4 text-sm leading-relaxed text-foreground">
          {text}
        </div>
      )}
    </div>
  );
}
