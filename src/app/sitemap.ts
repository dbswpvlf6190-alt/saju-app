import type { MetadataRoute } from "next";
import { ILGAN_PAGES } from "@/lib/saju/ilganPages";
import { TTI, TTI_PAIRS } from "@/lib/saju/ttiCompat";
import { BIRTH_YEARS } from "@/lib/saju/year2027";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://saju-app-three-dusky.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/ilgan`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...ILGAN_PAGES.map((p) => ({
      url: `${SITE_URL}/ilgan/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/compatibility`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    // 2027 정미년 띠별·나이별 운세(검색 입구, 12띠 + 1940~2009년생 70개) + 신년운세 단독 구매
    {
      url: `${SITE_URL}/2027`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...TTI.map((t) => ({
      url: `${SITE_URL}/2027/${t.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...BIRTH_YEARS.map((y) => ({
      url: `${SITE_URL}/2027/${y}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    {
      url: `${SITE_URL}/new-year`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    // 띠별 궁합(검색 입구, 78개 조합)
    {
      url: `${SITE_URL}/compatibility/tti`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...TTI_PAIRS.map((p) => ({
      url: `${SITE_URL}/compatibility/tti/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    {
      url: `${SITE_URL}/type-test`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/exam-luck/imyong`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/exam-luck`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    // 해외판(일본어·영어) 무료 결과 페이지
    ...(["ja", "en"] as const).map((lang) => ({
      url: `${SITE_URL}/${lang}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/refund`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];
}
