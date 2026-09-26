import { beforeAll, describe, expect, it } from "vitest";
import { birthKeyOf, signReferrerCookie, verifyReferrerCookie } from "../server";
import type { SajuInput } from "@/lib/saju";

const base: SajuInput = { calendarType: "solar", year: 1995, month: 5, day: 10, hour: 14, minute: 30, gender: "female" };

beforeAll(() => {
  process.env.ORDER_ACCESS_SECRET = "test-secret";
});

describe("birthKeyOf", () => {
  it("같은 입력이면 같은 값, 성별이 다르면 다른 값", async () => {
    expect(await birthKeyOf(base)).toBe(await birthKeyOf({ ...base }));
    expect(await birthKeyOf(base)).not.toBe(await birthKeyOf({ ...base, gender: "male" }));
  });

  it("생시를 모르면 분 값은 무시한다", async () => {
    const noHour = { ...base, hour: undefined };
    expect(await birthKeyOf({ ...noHour, minute: 0 })).toBe(await birthKeyOf({ ...noHour, minute: 45 }));
  });

  it("원본 생년월일이 값에 드러나지 않는다", async () => {
    const key = await birthKeyOf(base);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain("1995");
  });
});

describe("referrer cookie", () => {
  it("서명한 값은 검증되고, 다른 id로 바꾸면 거부된다", async () => {
    const cookie = await signReferrerCookie("ref_abc");
    expect(await verifyReferrerCookie(cookie)).toBe("ref_abc");

    const signature = cookie.slice(cookie.lastIndexOf(".") + 1);
    expect(await verifyReferrerCookie(`ref_other.${signature}`)).toBeNull();
    expect(await verifyReferrerCookie("garbage")).toBeNull();
    expect(await verifyReferrerCookie(undefined)).toBeNull();
  });
});
