import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NewYearReportText } from "../NewYearReportText";
import { parseNewYearText } from "@/lib/newYear/format";

const SAMPLE = `■ 2027 총평

2027년은 정미년, 한마디로 "돈과 성과를 현실적으로 관리하는 해"예요.

■ 분기별 키워드

1~3월 — 배움과 자기 확인의 시기

■ 월별 흐름

1월 — 아직 지난해 기운이 이어지는 때, 쉬어가도 좋은 시기예요.
2월 — 새해 기운 시작, 주관을 분명히 해보세요.
12월 — 일지와 합하는 달, 좋은 인연이 맺어지기 쉬워요.

■ 실천 조언 3가지

12월엔 평소 연락이 뜸했던 사람에게 먼저 안부를 전해보세요.`;

describe("NewYearReportText", () => {
  it("소제목·월별 줄·문단을 렌더링하고 ■ 기호는 노출하지 않는다", () => {
    const html = renderToStaticMarkup(createElement(NewYearReportText, { text: SAMPLE }));
    expect(html).toContain("2027 총평");
    expect(html).toContain("월별 흐름");
    expect(html).toContain("1월");
    expect(html).toContain("12월");
    expect(html).not.toContain("■");
  });

  it("예전(v1) 글은 문단 그대로 보여준다", () => {
    const html = renderToStaticMarkup(createElement(NewYearReportText, { text: "2027년은 정미년이에요.\n\n상반기에는..." }));
    expect(html).toContain("2027년은 정미년이에요.");
    expect(html).toContain("whitespace-pre-line");
  });

  it("텍스트에 HTML이 섞여도 이스케이프된다", () => {
    const html = renderToStaticMarkup(createElement(NewYearReportText, { text: "■ 제목\n<script>alert(1)</script>" }));
    expect(html).not.toContain("<script>");
  });

  it("샘플 구조: 소제목 4개, 월 줄 3개", () => {
    const blocks = parseNewYearText(SAMPLE);
    expect(blocks.filter((b) => b.kind === "heading")).toHaveLength(4);
    expect(blocks.filter((b) => b.kind === "month")).toHaveLength(3);
  });
});
