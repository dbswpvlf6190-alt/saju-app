import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://saju-app-three-dusky.vercel.app";

// 현재는 입력→결과가 전부 한 페이지(/)에서 이루어지는 구조라 실질적으로 페이지가 하나뿐이다.
// 이후 별도 정적 페이지(소개, 이용약관 등)가 생기면 여기에 추가한다.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
