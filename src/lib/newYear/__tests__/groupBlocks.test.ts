import { describe, expect, it } from "vitest";
import { groupNewYearBlocks, parseNewYearText } from "../format";

const TEXT = [
  "■ 2027 총평",
  "",
  "올해는 재물이 붙는 해예요.",
  "",
  "■ 월별 흐름",
  "",
  "1월 — 아직 지난해 기운이 이어져요.",
  "2월 — 새해 기운이 시작돼요.",
  "",
  "■ 실천 조언 3가지",
  "",
  "통장을 정리해 보세요.",
].join("\n");

describe("groupNewYearBlocks", () => {
  it("소제목별로 문단과 월별 줄을 묶는다", () => {
    const g = groupNewYearBlocks(parseNewYearText(TEXT));
    expect(g.intro).toEqual([]);
    expect(g.sections.map((s) => s.heading)).toEqual(["2027 총평", "월별 흐름", "실천 조언 3가지"]);
    expect(g.sections[0].paras).toEqual(["올해는 재물이 붙는 해예요."]);
    expect(g.sections[1].months.map((m) => m.month)).toEqual([1, 2]);
    expect(g.sections[2].paras).toEqual(["통장을 정리해 보세요."]);
    expect(g.monthLines).toEqual({ 1: "아직 지난해 기운이 이어져요.", 2: "새해 기운이 시작돼요." });
  });

  it("소제목이 없는 예전(v1) 글은 intro로 둔다", () => {
    const g = groupNewYearBlocks(parseNewYearText("2027년은 정미년이에요.\n\n상반기에는..."));
    expect(g.sections).toEqual([]);
    expect(g.intro).toHaveLength(1);
    expect(g.monthLines).toEqual({});
  });

  it("빈 글은 아무것도 만들지 않는다", () => {
    const g = groupNewYearBlocks(parseNewYearText("  "));
    expect(g).toEqual({ intro: [], sections: [], monthLines: {} });
  });
});
