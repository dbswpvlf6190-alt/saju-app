import { Noto_Sans_JP } from "next/font/google";

// 루트 레이아웃의 Noto Sans KR도 가나는 들어 있지만 한자 자형이 한국식이라, 일본어판은 일본 폰트로 덮는다.
const notoSansJP = Noto_Sans_JP({
  variable: "--font-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export default function JaLayout({ children }: LayoutProps<"/ja">) {
  return (
    <div lang="ja" className={`${notoSansJP.variable} flex flex-1 flex-col`} style={{ fontFamily: "var(--font-sans-jp), sans-serif" }}>
      {children}
    </div>
  );
}
