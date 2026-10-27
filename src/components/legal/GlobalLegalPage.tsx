import Link from "next/link";
import { GLOBAL_LEGAL, type LegalDoc } from "@/lib/global/legalCopy";
import type { GlobalLocale } from "@/lib/global/dayMasters";

export type GlobalLegalKind = "terms" | "privacy" | "refund";
const KINDS: GlobalLegalKind[] = ["terms", "privacy", "refund"];

/** 해외판 약관·환불·개인정보 페이지 공통 틀. 국내 LegalPage와 같은 모양이고 안내·링크만 해당 언어다. */
export function GlobalLegalPage({ locale, kind }: { locale: GlobalLocale; kind: GlobalLegalKind }) {
  const copy = GLOBAL_LEGAL[locale];
  const doc: LegalDoc = copy[kind];
  return (
    <div lang={locale} className="bg-starfield flex flex-1 flex-col items-center bg-background px-5 py-14">
      <div className="flex w-full max-w-2xl flex-col gap-8 pb-16">
        <div className="flex flex-col gap-2">
          <Link href={`/${locale}`} className="text-sm text-foreground-muted underline underline-offset-4">
            {copy.home}
          </Link>
          <h1 className="font-serif text-2xl text-accent-gold-soft">{doc.title}</h1>
          <p className="text-xs text-foreground-muted">{doc.updated}</p>
        </div>
        <div className="flex flex-col gap-6 leading-relaxed text-foreground [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-medium [&_h2]:text-accent-gold-soft [&_p]:text-foreground-muted [&_li]:text-foreground-muted [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
          {doc.blocks.map((block) => (
            <section key={block.h}>
              <h2>{block.h}</h2>
              {block.p?.map((line) => (
                <p key={line} className="whitespace-pre-line">
                  {line}
                </p>
              ))}
              {block.ul && (
                <ul>
                  {block.ul.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground-muted">
          {KINDS.filter((k) => k !== kind).map((k) => (
            <Link key={k} href={`/${locale}/${k}`} className="underline underline-offset-4">
              {copy.navLabels[k]}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
