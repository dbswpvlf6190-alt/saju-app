import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import Script from "next/script";
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
const TITLE = "사주랩 | 나의 사주와 궁합 알아보기";
const DESCRIPTION = "생년월일시로 알아보는 나의 사주팔자, 궁합, 오늘의 운세. 무료로 성격·오행 균형을 확인하세요.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "사주", "사주팔자", "궁합", "운세", "오행", "무료사주", "사주랩",
    "무료사주팔자", "생년월일 사주", "오늘의 운세", "무료 궁합", "사주 무료보기",
    "사주 궁합", "사주풀이", "만세력",
  ],
  alternates: { canonical: "/" },
  // 네이버 서치어드바이저 / 구글 서치콘솔에서 소유권을 인증받으면 그 코드를 Vercel
  // 환경변수(NAVER_SITE_VERIFICATION / GOOGLE_SITE_VERIFICATION)에 넣기만 하면
  // 코드 수정 없이 바로 적용된다 — 값이 없으면 해당 meta 태그 자체가 안 나간다.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.NAVER_SITE_VERIFICATION
      ? { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION }
      : undefined,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "사주랩",
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

// 검색엔진이 브랜드/사이트 자체를 이해하도록 돕는 전역 구조화 데이터. 페이지별 내용과
// 무관한 사이트 단위 정보라 루트 레이아웃 한 곳에만 둔다. 고정 값만 다뤄서 사용자 입력이
// 섞일 여지가 없다.
const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "사주랩",
  url: SITE_URL,
  description: DESCRIPTION,
  sameAs: ["https://www.instagram.com/sajulab_official/"],
};

const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "사주랩",
  url: SITE_URL,
  inLanguage: "ko-KR",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${notoSansKR.variable} ${notoSerifKR.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Script src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js" strategy="afterInteractive" />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD).replace(/</g, "\\u003c") }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_JSON_LD).replace(/</g, "\\u003c") }}
        />
      </body>
    </html>
  );
}
