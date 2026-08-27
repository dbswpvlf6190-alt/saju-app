import { describe, expect, it } from "vitest";
import { calculateSaju } from "../engine";
import { calculateCompatibilityScores, calculateFreeCompatibility } from "../compatibility";
import type { SajuResult } from "../types";

// 특정 날짜의 일간 오행을 미리 외워서 고정하는 대신, 실제 계산 결과를 훑어서
// "같은 오행" 쌍과 "상생 오행" 쌍을 직접 찾아낸다 — 명리학 지식에 대한 추측에 기대지 않고
// engine.ts가 실제로 계산한 값만 신뢰하는 테스트다.
function resultFor(day: number): SajuResult {
  return calculateSaju({ calendarType: "solar", year: 2000, month: 1, day, gender: "female" });
}

const CANDIDATES = Array.from({ length: 20 }, (_, i) => resultFor(i + 1));

function findPair(predicate: (a: SajuResult, b: SajuResult) => boolean): [SajuResult, SajuResult] {
  for (const a of CANDIDATES) {
    for (const b of CANDIDATES) {
      if (a === b) continue;
      if (predicate(a, b)) return [a, b];
    }
  }
  throw new Error("조건을 만족하는 날짜 쌍을 찾지 못했습니다(테스트 데이터 범위를 늘려야 함).");
}

const GENERATES: Record<string, string> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };

const [SAME_A, SAME_B] = findPair((a, b) => a.dayPillar.ganWuxing === b.dayPillar.ganWuxing);
const [GEN_A, GEN_B] = findPair((a, b) => GENERATES[a.dayPillar.ganWuxing] === b.dayPillar.ganWuxing);

describe("calculateFreeCompatibility", () => {
  it("같은 일간 오행이면 '비화' 관계다", () => {
    const free = calculateFreeCompatibility(SAME_A, SAME_B);
    expect(free.relation).toBe("비화");
  });

  it("한쪽이 다른 쪽을 낳는 오행 관계면 '상생'이다", () => {
    const free = calculateFreeCompatibility(GEN_A, GEN_B);
    expect(free.relation).toBe("상생");
  });

  it("점수는 항상 35~97 사이다", () => {
    const free = calculateFreeCompatibility(SAME_A, SAME_B);
    expect(free.overallScore).toBeGreaterThanOrEqual(35);
    expect(free.overallScore).toBeLessThanOrEqual(97);
  });

  it("같은 두 사람 조합은 항상 같은 점수를 낸다(결정적 계산)", () => {
    const first = calculateFreeCompatibility(SAME_A, SAME_B);
    const second = calculateFreeCompatibility(SAME_A, SAME_B);
    expect(first.overallScore).toBe(second.overallScore);
    expect(first.relation).toBe(second.relation);
  });

  it("본인/상대방 순서를 바꿔도 관계 판정은 동일하다", () => {
    const forward = calculateFreeCompatibility(GEN_A, GEN_B);
    const backward = calculateFreeCompatibility(GEN_B, GEN_A);
    expect(forward.relation).toBe(backward.relation);
  });
});

describe("calculateCompatibilityScores", () => {
  it("세부 점수(성격/연애/대화)도 모두 유효 범위 안에 있다", () => {
    const scores = calculateCompatibilityScores(SAME_A, SAME_B);
    for (const value of [scores.overall, scores.personality, scores.romance, scores.conversation]) {
      expect(value).toBeGreaterThanOrEqual(35);
      expect(value).toBeLessThanOrEqual(97);
    }
    expect(["낮음", "보통", "있음"]).toContain(scores.conflictRisk);
  });
});
