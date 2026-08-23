import type { ReactNode } from "react";
import Link from "next/link";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-starfield flex flex-1 flex-col items-center bg-background px-5 py-14">
      <div className="flex w-full max-w-2xl flex-col gap-8 pb-16">
        <div className="flex flex-col gap-2">
          <Link href="/" className="text-sm text-foreground-muted underline underline-offset-4">
            ← 홈으로
          </Link>
          <h1 className="font-serif text-2xl text-accent-gold-soft">{title}</h1>
        </div>
        <div className="flex flex-col gap-6 leading-relaxed text-foreground [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-medium [&_h2]:text-accent-gold-soft [&_p]:text-foreground-muted [&_li]:text-foreground-muted [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
          {children}
        </div>
      </div>
    </div>
  );
}
