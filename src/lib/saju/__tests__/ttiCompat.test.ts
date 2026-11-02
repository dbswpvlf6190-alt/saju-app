import { describe, expect, it } from "vitest";
import { TTI_PAIRS, TTI_PAIR_BY_SLUG } from "../ttiCompat";

const kinds = (slug: string) => TTI_PAIR_BY_SLUG[slug].relations.map((r) => r.kind);

describe("띠 궁합 페이지 데이터", () => {
  it("같은 띠 12 + 서로 다른 띠 66 = 78개, 주소가 겹치지 않는다", () => {
    expect(TTI_PAIRS).toHaveLength(78);
    expect(new Set(TTI_PAIRS.map((p) => p.slug)).size).toBe(78);
  });

  it("전통 지지 관계를 맞게 붙인다", () => {
    expect(kinds("jwi-so")).toEqual(["육합"]);
    expect(kinds("jwi-mal")).toContain("충");
    expect(kinds("jwi-yong")).toEqual(["삼합"]);
    expect(kinds("jwi-yang")).toEqual(expect.arrayContaining(["원진"]));
    expect(kinds("jwi-yang")).not.toContain("해"); // 자미는 해·원진이 겹쳐 원진 하나로만 보여 준다
    expect(kinds("horangi-dwaeji")).toEqual(["육합", "파"]);
    expect(kinds("baem-wonsungi")).toEqual(["육합", "형", "파"]);
    expect(kinds("yong-yong")).toEqual(["같은 띠", "형"]);
    expect(kinds("jwi-jwi")).toEqual(["같은 띠"]);
    expect(kinds("so-horangi")).toEqual([]);
  });

  it("단정하는 표현을 쓰지 않는다", () => {
    const text = JSON.stringify(TTI_PAIRS);
    for (const banned of ["반드시", "무조건", "100%", "절대", "이혼", "사망"]) expect(text).not.toContain(banned);
  });
});

describe("띠 궁합 문장 조사", () => {
  it("받침에 맞춰 이/가·을/를·와/과를 붙인다", () => {
    expect(TTI_PAIR_BY_SLUG["jwi-mal"].elementNote).toContain("쥐띠의 물(水)이 말띠의 불(火)을 누르는");
    expect(TTI_PAIR_BY_SLUG["horangi-mal"].elementNote).toContain("호랑이띠의 나무(木)가 말띠의 불(火)을 키워 주는");
    expect(TTI_PAIR_BY_SLUG["horangi-mal"].strengths.join(" ")).toContain("호랑이띠의 추진력과 말띠의 활동이 만나면");
    expect(TTI_PAIR_BY_SLUG["jwi-so"].tips.join(" ")).toContain("소띠는 '끈기'가 강점이에요");
    expect(TTI_PAIR_BY_SLUG["jwi-horangi"].tips.join(" ")).toContain("호랑이띠는 '의리'가 강점이에요");
    expect(TTI_PAIR_BY_SLUG["jwi-gae"].tips.join(" ")).toContain("개띠는 '책임'이 강점이에요");
  });
});
