import { describe, expect, it } from "vitest";
import { parseNewYearReturn } from "../returnParams";
import { parseNewYearText } from "../format";

const ID = "123e4567-e89b-12d3-a456-426614174000";

describe("parseNewYearReturn", () => {
  it("성공 복귀: paymentId만 있으면 failed가 아니다", () => {
    expect(parseNewYearReturn(`?paymentId=${ID}`)).toEqual({ paymentId: ID, failed: false, message: null });
  });

  it("실패·취소 복귀: code가 있으면 failed", () => {
    const r = parseNewYearReturn(`?paymentId=${ID}&code=FAILURE_TYPE_PG&message=${encodeURIComponent("취소했어요")}`);
    expect(r.failed).toBe(true);
    expect(r.message).toBe("취소했어요");
  });

  it("주문번호 형식이 아니면 null로 거른다(경로 조작 방지)", () => {
    expect(parseNewYearReturn("?paymentId=../../admin").paymentId).toBeNull();
    expect(parseNewYearReturn("").paymentId).toBeNull();
  });

  it("너무 긴 메시지는 잘라낸다", () => {
    expect(parseNewYearReturn(`?code=x&message=${"가".repeat(500)}`).message?.length).toBe(200);
  });
});

describe("parseNewYearText", () => {
  it("v2 글: 소제목·월별 줄·문단으로 나눈다", () => {
    const text = "■ 2027 총평\n\n올해는 정미년이에요.\n\n■ 월별 흐름\n\n1월 — 아직 지난해 기운이 이어지는 달이에요.\n12월 — 합하는 달이에요.";
    expect(parseNewYearText(text)).toEqual([
      { kind: "heading", text: "2027 총평" },
      { kind: "para", text: "올해는 정미년이에요." },
      { kind: "heading", text: "월별 흐름" },
      { kind: "month", month: 1, text: "아직 지난해 기운이 이어지는 달이에요." },
      { kind: "month", month: 12, text: "합하는 달이에요." },
    ]);
  });

  it("v1 글(소제목 없음)은 한 덩어리 문단으로 둔다", () => {
    const text = "2027년은 정미년이에요.\n\n상반기에는 ...";
    expect(parseNewYearText(text)).toEqual([{ kind: "para", text }]);
  });

  it("13월 같은 값은 월 줄로 보지 않는다", () => {
    const blocks = parseNewYearText("■ 제목\n13월 — 이건 월이 아님");
    expect(blocks[1]).toEqual({ kind: "para", text: "13월 — 이건 월이 아님" });
  });

  it("빈 글은 빈 배열", () => {
    expect(parseNewYearText("  \n ")).toEqual([]);
  });
});
