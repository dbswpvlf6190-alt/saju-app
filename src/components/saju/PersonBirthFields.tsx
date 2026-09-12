"use client";

import type { CalendarType, Gender } from "@/lib/saju/types";

export interface PersonFormValues {
  name: string;
  calendarType: CalendarType;
  isLeapMonth: boolean;
  year: number | null;
  month: number | null;
  day: number | null;
  timeUnknown: boolean;
  hour: number | null;
  minute: number | null;
  gender: Gender;
}

// 생년월일시는 일부러 기본값을 두지 않는다 — 기본값이 있으면 아무것도 안 고르고 바로
// 제출해도 그 기본값(2000년 1월 1일 등)으로 궁합이 계산돼서, 본인/상대방의 실제
// 생년월일시를 입력하지 않고도 "결과"가 나오는 것처럼 보이는 문제가 있었다
// (BirthInfoForm.tsx와 동일한 이유).
export const DEFAULT_PERSON_VALUES: PersonFormValues = {
  name: "",
  calendarType: "solar",
  isLeapMonth: false,
  year: null,
  month: null,
  day: null,
  timeUnknown: false,
  hour: null,
  minute: null,
  gender: "female",
};

/** 제출 가능한 상태인지(생년월일 + 시간을 모른다고 체크 안 했다면 시각까지) 확인한다. */
export function isPersonComplete(p: PersonFormValues): boolean {
  return p.year !== null && p.month !== null && p.day !== null && (p.timeUnknown || (p.hour !== null && p.minute !== null));
}

const YEAR_OPTIONS = Array.from({ length: 2100 - 1900 + 1 }, (_, i) => 2100 - i);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

// BirthInfoForm.tsx의 동일한 규칙을 그대로 따른다: 양력은 실제 마지막 날짜(윤년 포함)를
// 계산하고, 음력은 1~30일을 넉넉히 보여준 뒤 서버 검증에서 실존 여부를 최종 확인한다.
function getDayCount(calendarType: CalendarType, year: number, month: number): number {
  if (calendarType === "lunar") return 30;
  return new Date(year, month, 0).getDate();
}

const inputClass =
  "w-full rounded-xl border border-border-subtle bg-background-elevated px-3 py-2.5 text-foreground outline-none focus:border-accent-gold";

/** 궁합 입력용 1인분 생년월일시/성별 필드. 본인/상대방 두 번 재사용된다.
 * 이름은 화면 표시용일 뿐 서버로 전송·저장하지 않는다(개인정보 최소 수집 원칙). */
export function PersonBirthFields({
  idPrefix,
  title,
  nameOptionalLabel,
  value,
  onChange,
}: {
  idPrefix: string;
  title: string;
  nameOptionalLabel: string;
  value: PersonFormValues;
  onChange: (next: PersonFormValues) => void;
}) {
  const dayCount =
    value.year !== null && value.month !== null ? getDayCount(value.calendarType, value.year, value.month) : 31;
  const dayOptions = Array.from({ length: dayCount }, (_, i) => i + 1);
  const effectiveDay = value.day !== null ? Math.min(value.day, dayCount) : null;

  function patch(partial: Partial<PersonFormValues>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-background-card/70 p-4">
      <h3 className="font-medium text-accent-gold-soft">{title}</h3>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${idPrefix}-name`} className="text-sm text-foreground-muted">
          {nameOptionalLabel}
        </label>
        <input
          id={`${idPrefix}-name`}
          value={value.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="결과 화면에만 표시돼요"
          maxLength={20}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-foreground-muted">달력 기준</span>
        <div className="grid grid-cols-2 gap-2">
          {(["solar", "lunar"] as CalendarType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => patch({ calendarType: type, isLeapMonth: type === "solar" ? false : value.isLeapMonth })}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                value.calendarType === type
                  ? "border-accent-gold bg-accent-gold/15 text-accent-gold-soft"
                  : "border-border-subtle text-foreground-muted"
              }`}
            >
              {type === "solar" ? "양력" : "음력"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-foreground-muted">생년월일 (필수)</span>
        <div className="grid grid-cols-3 gap-2">
          <select
            aria-label="년"
            value={value.year ?? ""}
            onChange={(e) => patch({ year: e.target.value ? Number(e.target.value) : null })}
            className={inputClass}
          >
            <option value="" disabled>
              년도
            </option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <select
            aria-label="월"
            value={value.month ?? ""}
            onChange={(e) => patch({ month: e.target.value ? Number(e.target.value) : null })}
            className={inputClass}
          >
            <option value="" disabled>
              월
            </option>
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
          <select
            aria-label="일"
            value={effectiveDay ?? ""}
            onChange={(e) => patch({ day: e.target.value ? Number(e.target.value) : null })}
            className={inputClass}
          >
            <option value="" disabled>
              일
            </option>
            {dayOptions.map((d) => (
              <option key={d} value={d}>
                {d}일
              </option>
            ))}
          </select>
        </div>
        {value.calendarType === "lunar" && (
          <label className="mt-1 flex items-center gap-2 text-sm text-foreground-muted">
            <input
              type="checkbox"
              checked={value.isLeapMonth}
              onChange={(e) => patch({ isLeapMonth: e.target.checked })}
              className="h-4 w-4 accent-[var(--accent-gold)]"
            />
            윤달이에요
          </label>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground-muted">태어난 시각 (알면 더 정확해요)</span>
          <label className="flex items-center gap-2 text-sm text-foreground-muted">
            <input
              type="checkbox"
              checked={value.timeUnknown}
              onChange={(e) => patch({ timeUnknown: e.target.checked })}
              className="h-4 w-4 accent-[var(--accent-gold)]"
            />
            시간 모름
          </label>
        </div>
        {!value.timeUnknown && (
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="시"
              value={value.hour ?? ""}
              onChange={(e) => patch({ hour: e.target.value ? Number(e.target.value) : null })}
              className={inputClass}
            >
              <option value="" disabled>
                시
              </option>
              {Array.from({ length: 24 }, (_, h) => h).map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}시
                </option>
              ))}
            </select>
            <select
              aria-label="분"
              value={value.minute ?? ""}
              onChange={(e) => patch({ minute: e.target.value ? Number(e.target.value) : null })}
              className={inputClass}
            >
              <option value="" disabled>
                분
              </option>
              {Array.from({ length: 60 }, (_, m) => m).map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, "0")}분
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-foreground-muted">성별 (필수)</span>
        <div className="grid grid-cols-2 gap-2">
          {([
            ["male", "남성"],
            ["female", "여성"],
          ] as [Gender, string][]).map(([g, label]) => (
            <button
              key={g}
              type="button"
              onClick={() => patch({ gender: g })}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                value.gender === g
                  ? "border-accent-gold bg-accent-gold/15 text-accent-gold-soft"
                  : "border-border-subtle text-foreground-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** isPersonComplete(p)로 검증된 뒤에만 호출한다는 전제로, 필수값의 null 아님을
 * 단언한다(!) — 호출부(CompatibilityForm)가 검증 전에는 제출 버튼을 막아둔다. */
export function personToSajuInput(p: PersonFormValues) {
  return {
    calendarType: p.calendarType,
    isLeapMonth: p.calendarType === "lunar" ? p.isLeapMonth : false,
    year: p.year!,
    month: p.month!,
    day: Math.min(p.day!, getDayCount(p.calendarType, p.year!, p.month!)),
    hour: p.timeUnknown ? undefined : p.hour!,
    minute: p.timeUnknown ? undefined : p.minute!,
    gender: p.gender,
  };
}
