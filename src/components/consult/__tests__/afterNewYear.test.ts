import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ConsultAfterNewYear } from "../ConsultAfterNewYear";
import { prefillToPerson } from "@/lib/consult/prefill";

describe("신년운세 뒤 AI 상담 카드 (2026-11-21 C3)", () => {
  it("5회 상품으로 가는 링크·가격·생일 이어짐 안내가 보인다", () => {
    const html = renderToStaticMarkup(
      createElement(ConsultAfterNewYear, {
        input: { calendarType: "solar", year: 1975, month: 3, day: 14, gender: "female" },
        name: "순자",
        place: "return",
      }),
    );
    expect(html).toContain('href="/consult?product=consult_5&amp;ref=ny_after_return"');
    expect(html).toContain("4,990원");
    expect(html).toContain("생일은 방금 넣은 그대로 이어져요");
  });

  it("생일을 모르면 이어짐 안내를 빼고 링크는 그대로", () => {
    const html = renderToStaticMarkup(createElement(ConsultAfterNewYear, { input: null, name: "", place: "standalone" }));
    expect(html).not.toContain("이어져요 ·");
    expect(html).toContain("ref=ny_after_standalone");
  });

  it("저장된 생일을 입력칸 값으로 바꾼다(시간 모름 포함)", () => {
    const p = prefillToPerson({ input: { calendarType: "lunar", isLeapMonth: true, year: 1966, month: 8, day: 2, gender: "male" }, name: "영수" });
    expect(p).toMatchObject({ name: "영수", calendarType: "lunar", isLeapMonth: true, year: 1966, month: 8, day: 2, timeUnknown: true, hour: null, gender: "male" });
    const q = prefillToPerson({ input: { calendarType: "solar", year: 1980, month: 1, day: 1, hour: 7, minute: 30, gender: "female" }, name: "" });
    expect(q).toMatchObject({ timeUnknown: false, hour: 7, minute: 30 });
  });
});
