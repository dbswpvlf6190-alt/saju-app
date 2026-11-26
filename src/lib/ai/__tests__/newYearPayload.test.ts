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

describe("buildNewYearPayload 지난 날짜 거르기", () => {
  const hook = buildNewYearHook(person, 2027);

  it("today가 없거나 해가 바뀌기 전이면 좋은 날짜를 그대로 둔다", () => {
    const before = buildNewYearPayload(person, 2027, new Date("2026-12-31T14:00:00Z")); // 한국 1/1 23시 전
    before.월별_사실.forEach((m, i) => expect(m.좋은_날짜).toHaveLength(hook.flow[i].goodDays.length));
  });

  it("해가 바뀐 뒤엔 한국 시간 오늘 이전 날짜를 빼고, 오늘은 남긴다", () => {
    const jan = hook.flow[0].goodDays;
    const cut = jan[jan.length - 1]; // 1월 마지막 좋은 날 아침(한국 시간)
    const after = buildNewYearPayload(person, 2027, new Date(Date.UTC(2027, 0, cut, 0, 0) - 9 * 60 * 60 * 1000 + 60 * 60 * 1000));
    expect(after.월별_사실[0].좋은_날짜).toEqual([`${cut}일(${weekdayKor(2027, 1, cut)})`]);
    expect(after.월별_사실[1].좋은_날짜).toHaveLength(hook.flow[1].goodDays.length);
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
    expect(NEW_YEAR_SYSTEM_PROMPT).toContain("날짜(몇 일 전후)는 쓰지 마세요");
    expect(NEW_YEAR_SYSTEM_PROMPT).toContain("좋은_날짜");
    expect(NEW_YEAR_SYSTEM_PROMPT).toContain("새 날짜를 만들지 마세요");
  });

  it("품질: 전문 용어·같은 말 반복·한 해를 마친 듯한 인사를 막는다", () => {
    expect(NEW_YEAR_SYSTEM_PROMPT).toContain("한 번도 쓰지 말고 뜻으로만");
    expect(NEW_YEAR_SYSTEM_PROMPT).toContain("같은 말을 되풀이해서 분량을 채우지 마세요");
    expect(NEW_YEAR_SYSTEM_PROMPT).toContain("고생 많으셨어요");
  });

  it("총평 첫 문장에 한 해 이름을 쓰게 한다(미리보기와 같은 이름)", () => {
    expect(NEW_YEAR_SYSTEM_PROMPT).toContain("한_해_이름");
  });
});
