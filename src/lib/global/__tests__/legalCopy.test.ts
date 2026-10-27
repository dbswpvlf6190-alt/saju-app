import { describe, expect, it } from "vitest";
import { GLOBAL_LEGAL, OPERATOR_EN, OPERATOR_JA } from "../legalCopy";
import { CONTACT_EMAIL } from "@/lib/business";

const HANGUL = /[ㄱ-ㆎ가-힣]/;
const KINDS = ["terms", "privacy", "refund"] as const;

function strings(doc: { blocks: { h: string; p?: string[]; ul?: string[] }[] }): string[] {
  return doc.blocks.flatMap((b) => [b.h, ...(b.p ?? []), ...(b.ul ?? [])]);
}

describe("해외판 약관·환불·개인정보 초안", () => {
  it("영어·일본어 모두 세 문서가 있고 문단이 충분하다", () => {
    for (const locale of ["en", "ja"] as const) {
      for (const kind of KINDS) {
        const doc = GLOBAL_LEGAL[locale][kind];
        expect(doc.title.length).toBeGreaterThan(3);
        expect(doc.blocks.length).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it("한글은 사업자 정보(상호·대표자·주소)에만 나온다", () => {
    const operator = new Set([...OPERATOR_EN, ...OPERATOR_JA]);
    for (const locale of ["en", "ja"] as const) {
      for (const kind of KINDS) {
        for (const s of strings(GLOBAL_LEGAL[locale][kind])) {
          if (HANGUL.test(s)) expect(operator.has(s), `${locale}.${kind}: ${s}`).toBe(true);
        }
      }
    }
  });

  it("환불·개인정보 문서에 문의 이메일과 보관기간(5년)이 있다", () => {
    for (const locale of ["en", "ja"] as const) {
      const refund = strings(GLOBAL_LEGAL[locale].refund).join("\n");
      const privacy = strings(GLOBAL_LEGAL[locale].privacy).join("\n");
      expect(refund).toContain(CONTACT_EMAIL);
      expect(privacy).toContain(CONTACT_EMAIL);
      expect(privacy).toMatch(/5 years|5年間/);
      expect(refund).toMatch(/7 days|7日/);
    }
  });

  it("일본어 약관에 특정상거래법 표기가 있다", () => {
    expect(strings(GLOBAL_LEGAL.ja.terms).join("\n")).toContain("特定商取引法に基づく表記");
  });

  it("초안 표시(TODO 등)가 공개 문구에 남아 있지 않다", () => {
    for (const locale of ["en", "ja"] as const) {
      for (const kind of KINDS) {
        expect(strings(GLOBAL_LEGAL[locale][kind]).join("\n")).not.toMatch(/TODO|TBD|\[to be/i);
      }
    }
  });
});
