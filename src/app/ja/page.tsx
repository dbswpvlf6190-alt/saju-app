import type { Metadata } from "next";
import { GlobalSajuFlow } from "@/components/global/GlobalSajuFlow";

const TITLE = "韓国式・四柱推命｜生年月日であなたの本質を無料診断 - サジュラボ";
const DESCRIPTION =
  "韓国で人気の四柱推命サービス「サジュラボ」日本語版。生年月日を入れるだけで、あなたの日干（本質）と五行バランスを30秒で無料診断。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/ja", languages: { ko: "/", ja: "/ja", en: "/en" } },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/ja", siteName: "サジュラボ", locale: "ja_JP", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function JaHome() {
  return (
    <div className="bg-starfield flex flex-1 flex-col items-center bg-background px-5 py-14">
      <GlobalSajuFlow locale="ja" />
    </div>
  );
}
