import { describe, expect, it } from "vitest";
import { calculateSaju } from "@/lib/saju";
import { buildNewYearHook, weekdayKor } from "@/lib/saju/newYearHook";
import { NEW_YEAR_SYSTEM_PROMPT, buildNewYearPayload } from "../interpretSaju";

const person = calculateSaju({ calendarType: "solar", gender: "female", year: 1965, month: 3, day: 14 });

describe("buildNewYearPayload", () => {
  const p = buildNewYearPayload(person, 2027);
  const hook = buildNewYearHook(person, 2027);

  it("열두 달 사실에 계산한 제목·좋은 날짜가 들어 있어 미리보기 카드와 같다", () => {
    expect(p.월별_사실).toHaveLength(12);
    p.월별_사실.forEach((m, i) => {
      expect(m.제목).toBe(hook.flow[i].title);
      expect(m.좋은_날짜).toEqual(hook.flow[i].goodDays.map((d) => `${d}일(${weekdayKor(2027, i + 1, d)})`));
      expect(m.좋은_날짜.length).toBeLessThanOrEqual(3);
    });
  });

  it("한 해 이름과 가장 좋은 두 달이 결제 전 카드와 같은 값이다", () => {
    expect(p.한_해_이름).toBe(hook.label);
    expect(p.가장_좋은_두_달).toEqual(hook.best.map((m) => `${m.month}월 ${m.title}`));
    expect(p.가장_좋은_두_달).toHaveLength(2);
  });

  it("1월만 입춘 전, 개인 식별 정보(이름·생년월일 원문)는 담지 않는다", () => {
    expect(p.월별_사실.filter((m) => m.입춘전).map((m) => m.월)).toEqual(["1월"]);
    const json = JSON.stringify(p);
    expect(json).not.toContain("1965");
    expect(json).not.toMatch(/email|phone|이름:/);
  });
});

describe("NEW_YEAR_SYSTEM_PROMPT (50~60대 손님·토스 검수 기준)", () => {
  it("겁주는 소제목 대신 '차분히 챙기면 좋은 달'을 쓰고 위험·건강 소재를 금지한다", () => {
    expect(NEW_YEAR_SYSTEM_PROMPT).toContain("■ 차분히 챙기면 좋은 달");
    expect(NEW_YEAR_SYSTEM_PROMPT).not.toContain("■ 조심하면 좋은 달");
    expect(NEW_YEAR_SYSTEM_PROMPT).toContain("건강, 질병");
    expect(NEW_YEAR_SYSTEM_PROMPT).toContain("점수나 등급");
  });

  it("월별 줄에 날짜를 나열하지 않게 하고, 날짜는 계산값 안에서만 고르게 한다", () => {
    expect(NEW_YEAR_SYSTEM_PROMPT).toContain("나열하지 말고");
    expect(NEW_YEAR_SYSTEM_PROMPT).toContain("좋은_날짜");
    expect(NEW_YEAR_SYSTEM_PROMPT).toContain("새 날짜를 만들지 마세요");
  });

  it("총평 첫 문장에 한 해 이름을 쓰게 한다(미리보기와 같은 이름)", () => {
    expect(NEW_YEAR_SYSTEM_PROMPT).toContain("한_해_이름");
  });
});
