import { describe, expect, it } from "vitest";
import { EXAM_SEASONS, formatExamDate, getSeasonStatus, kstDateString } from "../seasons";

// 한국 시간 자정 직후/직전 경계를 확인하려고 UTC로 시각을 만든다(KST = UTC+9).
const kst = (date: string, hour = 12) => new Date(`${date}T${String(hour).padStart(2, "0")}:00:00+09:00`);

describe("kstDateString", () => {
  it("UTC로는 전날이어도 한국 시간 날짜를 쓴다", () => {
    expect(kstDateString(new Date("2026-11-18T16:30:00Z"))).toBe("2026-11-19");
  });
});

describe("getSeasonStatus - 수능", () => {
  const season = EXAM_SEASONS.suneung;

  it("시험 전에는 남은 날을 센다", () => {
    const status = getSeasonStatus(season, kst("2026-09-26"));
    expect(status).toEqual({ phase: "active", events: [{ kind: "upcoming", event: season.events[0], daysLeft: 54 }] });
  });

  it("시험 당일에는 D-DAY", () => {
    const status = getSeasonStatus(season, kst("2026-11-19", 0));
    expect(status.phase).toBe("active");
    expect(status.phase === "active" && status.events[0].kind).toBe("today");
  });

  it("시험이 지나면 연말까지 수고 문구, 그 뒤엔 숨김", () => {
    expect(getSeasonStatus(season, kst("2026-11-20")).phase).toBe("wrapUp");
    expect(getSeasonStatus(season, kst("2026-12-31")).phase).toBe("wrapUp");
    expect(getSeasonStatus(season, kst("2027-01-01")).phase).toBe("off");
  });
});

describe("getSeasonStatus - 임용", () => {
  const season = EXAM_SEASONS.imyong;

  it("초등이 지나면 중등만 남는다", () => {
    const status = getSeasonStatus(season, kst("2026-11-08"));
    expect(status.phase === "active" && status.events.map((e) => e.event.label)).toEqual(["중등 1차"]);
  });
});

describe("formatExamDate", () => {
  it("요일을 붙인다", () => {
    expect(formatExamDate("2026-11-19")).toBe("11월 19일(목)");
    expect(formatExamDate("2026-11-07")).toBe("11월 7일(토)");
  });
});
