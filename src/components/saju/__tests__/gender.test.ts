import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BirthInfoForm } from "../BirthInfoForm";
import { DEFAULT_PERSON_VALUES, isPersonComplete } from "../PersonBirthFields";

describe("성별은 기본값 없이 필수", () => {
  const filled = { ...DEFAULT_PERSON_VALUES, year: 1999, month: 1, day: 1, timeUnknown: true };

  it("기본값에는 성별이 없다", () => {
    expect(DEFAULT_PERSON_VALUES.gender).toBeNull();
  });

  it("생년월일을 다 채워도 성별이 없으면 제출할 수 없다", () => {
    expect(isPersonComplete(filled)).toBe(false);
    expect(isPersonComplete({ ...filled, gender: "male" })).toBe(true);
    expect(isPersonComplete({ ...filled, gender: "female" })).toBe(true);
  });

  it("일반 입력 화면: 처음엔 어느 성별도 선택돼 있지 않고 제출 버튼이 막혀 있다", () => {
    const html = renderToStaticMarkup(createElement(BirthInfoForm, { onSubmit: () => {}, submitting: false, errorMessage: null }));
    expect(html).toContain("남성");
    expect(html).toContain("여성");
    expect(html).not.toContain("bg-accent-gold/15 text-accent-gold-soft\">여성");
    expect(html).not.toContain("bg-accent-gold/15 text-accent-gold-soft\">남성");
    expect(html).toContain("생년월일시를 선택해주세요");
    expect(html).toMatch(/<button[^>]*disabled[^>]*>생년월일시를 선택해주세요/);
  });
});
