"use client";

import type { CalendarType, Gender } from "@/lib/saju/types";

export interface PersonFormValues {
  name: string;
  calendarType: CalendarType;
  isLeapMonth: boolean;
  year: number;
  month: number;
  day: number;
  timeUnknown: boolean;
  hour: number;
  minute: number;
  gender: Gender;
}

export const DEFAULT_PERSON_VALUES: PersonFormValues = {
  name: "",
  calendarType: "solar",
  isLeapMonth: false,
  year: 2000,
  month: 1,
  day: 1,
  timeUnknown: false,
  hour: 12,
  minute: 0,
  gender: "female",
};

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
  const dayCount = getDayCount(value.calendarType, value.year, value.month);
  const dayOptions = Array.from({ length: dayCount }, (_, i) => i + 1);
  const effectiveDay = Math.min(value.day, dayCount);

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
            value={value.year}
            onChange={(e) => patch({ year: Number(e.target.value) })}
            className={inputClass}
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
          <select
            aria-label="월"
            value={value.month}
            onChange={(e) => patch({ month: Number(e.target.value) })}
            className={inputClass}
          >
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}월
              </option>
            ))}
          </select>
          <select
            aria-label="일"
            value={effectiveDay}
            onChange={(e) => patch({ day: Number(e.target.value) })}
            className={inputClass}
          >
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
              value={value.hour}
              onChange={(e) => patch({ hour: Number(e.target.value) })}
              className={inputClass}
            >
              {Array.from({ length: 24 }, (_, h) => h).map((h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}시
                </option>
              ))}
            </select>
            <select
              aria-label="분"
              value={value.minute}
              onChange={(e) => patch({ minute: Number(e.target.value) })}
              className={inputClass}
            >
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
            ["female", "여성"],
            ["male", "남성"],
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

export function personToSajuInput(p: PersonFormValues) {
  return {
    calendarType: p.calendarType,
    isLeapMonth: p.calendarType === "lunar" ? p.isLeapMonth : false,
    year: p.year,
    month: p.month,
    day: Math.min(p.day, getDayCount(p.calendarType, p.year, p.month)),
    hour: p.timeUnknown ? undefined : p.hour,
    minute: p.timeUnknown ? undefined : p.minute,
    gender: p.gender,
  };
}
