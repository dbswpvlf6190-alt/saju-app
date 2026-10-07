import { describe, expect, it } from "vitest";
import { calculateSaju } from "../engine";
import { buildManualFacts, groupOfTenGod, tenGodOf } from "../manualFacts";

describe("tenGodOf", () => {
  it("병화 일간 기준 십성이 전통 규칙과 같다", () => {
    expect(tenGodOf("병", "병")).toBe("비견");
    expect(tenGodOf("병", "정")).toBe("겁재");
    expect(tenGodOf("병", "무")).toBe("식신");
    expect(tenGodOf("병", "기")).toBe("상관");
    expect(tenGodOf("병", "경")).toBe("편재");
    expect(tenGodOf("병", "신")).toBe("정재");
    expect(tenGodOf("병", "임")).toBe("편관");
    expect(tenGodOf("병", "계")).toBe("정관");
    expect(tenGodOf("병", "갑")).toBe("편인");
    expect(tenGodOf("병", "을")).toBe("정인");
  });

  it("재성은 병화에게 금이다(수가 아니다)", () => {
    expect(groupOfTenGod(tenGodOf("병", "경"))).toBe("재성");
    expect(groupOfTenGod(tenGodOf("병", "임"))).toBe("관성");
  });
});

describe("buildManualFacts", () => {
  const result = calculateSaju({ calendarType: "solar", year: 2003, month: 1, day: 13, hour: 13, minute: 28, gender: "male" });
  const facts = buildManualFacts(result, new Date(2026, 9, 7));

  it("2003-01-13 13:28 남: 사주와 십성 배치", () => {
    expect(facts.사주).toEqual({ 년주: "임오", 월주: "계축", 일주: "병술", 시주: "을미" });
    expect(facts.십성_배치).toMatchObject({
      "년주_천간(임)": "편관",
      "월주_천간(계)": "정관",
      "시주_천간(을)": "정인",
      "년주_지지(오)": "겁재",
      "월주_지지(축)": "상관",
      "일주_지지(술)": "식신",
      "시주_지지(미)": "상관",
    });
  });

  it("십성 분포와 없는 기운(재성 0개)", () => {
    expect(facts.십성_분포).toEqual({ 비겁: 1, 식상: 3, 재성: 0, 관성: 2, 인성: 1 });
    expect(facts.없는_기운).toEqual(["재성"]);
    expect(facts.태어난_계절).toContain("겨울");
    expect(facts.나이대).toBe("20대 초반");
  });

  it("일간 곁의 기운(월간·일지·시간)을 코드가 분류한다", () => {
    expect(facts.곁의_기운.항목).toEqual([
      "월간: 정관(관성) — 일간을 누르는(부담이 되는) 기운",
      "일지: 식신(식상) — 일간의 힘을 쓰게 하는 기운",
      "시간: 정인(인성) — 일간을 돕는 기운",
    ]);
    expect(facts.곁의_기운.요약).toBe("돕는 기운 1개 / 힘을 쓰거나 부담이 되는 기운 2개 → 힘을 쓰거나 부담이 되는 쪽이 우세");
    expect(facts.무료_화면에서_예고한_궁금증).toContain("불씨");
    expect(facts.무료_화면에서_예고한_궁금증).not.toContain("1장에서");
  });

  it("올해·앞으로의 해 흐름은 코드가 계산한다", () => {
    expect(facts.올해_흐름["2026"]).toContain("병오년, 비겁");
    expect(facts.올해_흐름["2030"]).toContain("재성");
    expect(facts.올해_흐름["2030"]).toContain("원래 없던 기운");
  });

  it("달별 흐름은 같은 기운을 구간으로 묶는다", () => {
    expect(facts.달별_흐름).toContain("2026-10~11 식상");
    expect(facts.달별_흐름).toContain("2026-12~01 재성");
  });
});
