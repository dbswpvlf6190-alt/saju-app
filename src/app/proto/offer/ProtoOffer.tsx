"use client";
import { calculateSaju } from "@/lib/saju/engine";
import { generateFreeContent, getPremiumSections } from "@/lib/saju/content";
import { PremiumOffer } from "@/components/saju/PremiumOffer";

export function ProtoOffer({ mode }: { mode: "full" | "single" }) {
  const result = calculateSaju({ calendarType: "solar", gender: "female", year: 1995, month: 7, day: 12, hour: 14, minute: 30 });
  const sections = getPremiumSections(result);
  const love = sections.find((s) => s.key === "love")!;
  const ordered = [love, ...sections.filter((s) => s.key !== "love")];
  return (
    <PremiumOffer
      name="지수"
      dayMasterLabel={generateFreeContent(result).dayMasterLabel}
      premiumSections={ordered}
      onChoose={() => {}}
      initialMode={mode}
    />
  );
}
