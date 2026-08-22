"use client";

import { useState, type FormEvent } from "react";
import type { CalendarType, Gender } from "@/lib/saju";

export interface BirthInfoFormValues {
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

const YEAR_OPTIONS = Array.from({ length: 2100 - 1900 + 1 }, (_, i) => 2100 - i);
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

/** 양력은 실제 그 달의 마지막 날짜(윤년 2월 포함)를 정확히 계산한다.
 * 음력은 윤달 유무에 따라 날짜 수가 달마다 달라 브라우저에서 정확히 계산할 수 없으므로
 * 1~30일을 넉넉히 보여주고, 실제 존재하지 않는 날짜는 제출 시 서버 쪽 검증에서 걸러진다. */
function getDayCount(calendarType: CalendarType, year: number, month: number): number {
  if (calendarType === "lunar") return 30;
  return new Date(year, month, 0).getDate();
}

const inputClass =
  "w-full rounded-xl border border-border-subtle bg-background-elevated px-3 py-2.5 text-foreground outline-none focus:border-accent-gold";

export function BirthInfoForm({
  onSubmit,
  submitting,
  errorMessage,
}: {
  onSubmit: (values: BirthInfoFormValues) => void;
  submitting: boolean;
  errorMessage: string | null;
}) {
  const [name, setName] = useState("");
  const [calendarType, setCalendarType] = useState<CalendarType>("solar");
  const [isLeapMonth, setIsLeapMonth] = useState(false);
  const [year, setYear] = useState(2000);
  const [month, setMonth] = useState(1);
  const [day, setDay] = useState(1);
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [gender, setGender] = useState<Gender>("female");

  // day는 그대로 두고(달을 바꿨다 되돌려도 원래 고른 날짜가 유지되도록), 실제로 존재하지
  // 않는 날짜가 되는 경우에만 선택지/제출값에서 그 달의 마지막 날로 보정해서 사용한다.
  const dayCount = getDayCount(calendarType, year, month);
  const dayOptions = Array.from({ length: dayCount }, (_, i) => i + 1);
  const effectiveDay = Math.min(day, dayCount);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      name: name.trim(),
      calendarType,
      isLeapMonth: calendarType === "lunar" ? isLeapMonth : false,
      year,
      month,
      day: effectiveDay,
      timeUnknown,
      hour,
      minute,
      gender,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-sm text-foreground-muted">
          이름 (선택)
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
              onClick={() => setCalendarType(type)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                calendarType === type
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
        <span className="text-sm text-foreground-muted">생년월일</span>
        <div className="grid grid-cols-3 gap-2">
          <select
            aria-label="년"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
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
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
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
            onChange={(e) => setDay(Number(e.target.value))}
            className={inputClass}
          >
            {dayOptions.map((d) => (
              <option key={d} value={d}>
                {d}일
              </option>
            ))}
          </select>
        </div>
        {calendarType === "lunar" && (
          <label className="mt-1 flex items-center gap-2 text-sm text-foreground-muted">
            <input
              type="checkbox"
              checked={isLeapMonth}
              onChange={(e) => setIsLeapMonth(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent-gold)]"
            />
            윤달이에요
          </label>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground-muted">태어난 시각</span>
          <label className="flex items-center gap-2 text-sm text-foreground-muted">
            <input
              type="checkbox"
              checked={timeUnknown}
              onChange={(e) => setTimeUnknown(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent-gold)]"
            />
            시간 모름
          </label>
        </div>
        {!timeUnknown && (
          <div className="grid grid-cols-2 gap-2">
            <select
              aria-label="시"
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
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
              value={minute}
              onChange={(e) => setMinute(Number(e.target.value))}
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
        <span className="text-sm text-foreground-muted">성별</span>
        <div className="grid grid-cols-2 gap-2">
          {([
            ["female", "여성"],
            ["male", "남성"],
          ] as [Gender, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setGender(value)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                gender === value
                  ? "border-accent-gold bg-accent-gold/15 text-accent-gold-soft"
                  : "border-border-subtle text-foreground-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 rounded-xl bg-accent-gold px-4 py-3.5 text-center text-base font-semibold text-[#1a1430] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "사주를 풀이하는 중..." : "무료로 사주 보기"}
      </button>
    </form>
  );
}
