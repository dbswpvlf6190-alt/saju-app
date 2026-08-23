import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import "./globals.css";

// Noto Sans/Serif KR은 한글이 폰트의 기본 문자셋이라 "subsets"는 라틴/기타 보충 범위만
// 추가로 지정하는 옵션이다(next/font 타입상 "korean"이라는 subset 값 자체가 없음).
// 즉 한글은 subsets 설정과 무관하게 항상 포함되고, latin은 숫자/영문(예: "SAJU READING")도
// 같은 폰트로 렌더링되도록 하기 위해 추가한 것이다.
const notoSansKR = Noto_Sans_KR({
  variable: "--font-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const notoSerifKR = Noto_Serif_KR({
  variable: "--font-serif-kr",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://saju-app-three-dusky.vercel.app";
const TITLE = "사주풀이 | 오늘의 나를 읽다";
const DESCRIPTION = "생년월일시로 알아보는 나의 사주팔자와 운세 분석. 무료로 성격·오행 균형을 확인하세요.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["사주", "사주팔자", "운세", "오행", "무료사주", "사주풀이"],
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "사주풀이",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0e0b1f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${notoSansKR.variable} ${notoSerifKR.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
