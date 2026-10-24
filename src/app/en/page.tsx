import type { Metadata } from "next";
import { GlobalSajuFlow } from "@/components/global/GlobalSajuFlow";

const TITLE = "K-Saju: Free Korean Four Pillars Reading by Birthday - Saju Lab";
const DESCRIPTION =
  "Korea's traditional birth chart reading, in English. Enter your birthday to discover your Day Master and Five Elements balance — free, 30 seconds, no sign-up.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/en", languages: { ko: "/", ja: "/ja", en: "/en" } },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/en", siteName: "Saju Lab", locale: "en_US", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function EnHome() {
  return (
    <div className="bg-starfield flex flex-1 flex-col items-center bg-background px-5 py-14">
      <GlobalSajuFlow locale="en" />
    </div>
  );
}
