import { describe, expect, it } from "vitest";
import { calculateSaju } from "../engine";
import { getMonthPreview, getYearFlow } from "../monthPreview";

// 달마다 같은 문장이 반복되면 "나머지도 같은 내용"으로 느껴 결제 이유가 사라진다(10/23 사장님 피드백, 10/26 실제 12달 결과에서 재확인).
function people() {
  const out = [];
  for (let y = 1952; y <= 1974; y += 4)
    for (let m = 2; m <= 12; m += 3)
      for (let d = 4; d <= 27; d += 7) out.push(calculateSaju({ calendarType: "solar", gender: "female", year: y, month: m, day: d }));
  return out;
}

describe("달별 문구 다양성", () => {
  it("한 해 열두 달에서 재물 문장이 서로 다른 것이 최소 8가지, 같은 기운이 이어져도 같은 문장이 연달아 나오지 않는다", () => {
    for (const r of people()) {
      const flow = getYearFlow(r, 2027);
      expect(new Set(flow.map((m) => m.money)).size).toBeGreaterThanOrEqual(8);
      for (let i = 1; i < flow.length; i++) {
        if (flow[i].group === flow[i - 1].group) {
          expect(flow[i].money).not.toBe(flow[i - 1].money);
          expect(flow[i].tip.replace(/\d+월 \d+일/, "")).not.toBe(flow[i - 1].tip.replace(/\d+월 \d+일/, ""));
        }
      }
    }
  }, 30000);

  it("같은 생일·같은 해는 언제 봐도 같은 문구(결정적)", () => {
    const r = people()[3];
    expect(JSON.stringify(getYearFlow(r, 2027))).toBe(JSON.stringify(getYearFlow(r, 2027)));
  });

  it("variant를 바꾸면 같은 달의 재물·할 일 문구가 바뀌고, 날짜는 그대로다", () => {
    const r = people()[0];
    const a = getMonthPreview(r, 2027, 6, 0);
    const b = getMonthPreview(r, 2027, 6, 1);
    expect(b.money).not.toBe(a.money);
    expect(b.goodDays).toEqual(a.goodDays);
    expect(b.bestDay).toBe(a.bestDay);
  });

  it("모든 문구가 존댓말이고 겁주기·건강·단정 표현이 없다", () => {
    for (const r of people().slice(0, 12)) {
      for (const m of getYearFlow(r, 2027)) {
        const all = `${m.title} ${m.money} ${m.people} ${m.tip}`;
        expect(all, `${m.month}월`).not.toMatch(/반드시|위험|불행|나쁜|건강|병원|사고|죽|조심해야|큰일/);
        expect(m.money.endsWith("요.") || m.money.endsWith("요"), m.money).toBe(true);
        expect(m.people.endsWith("요."), m.people).toBe(true);
      }
    }
  }, 30000);
});
