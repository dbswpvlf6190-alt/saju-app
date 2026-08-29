// 사주랩 카드뉴스 빌드 스크립트 — 세트 하나당 표지+내용+CTA PNG 여러 장을 생성한다.
// 실행: node scripts/cardnews-template/build.mjs
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { frame, line, keyword, ctaButton, renderTo, GOLD, SOFT_GOLD, IVORY, MUTED } from "./theme.mjs";
import { CARD_SETS_IN_ORDER, CTA_HEADLINE, CTA_BUTTON } from "./content.mjs";

const PROJECT_ROOT = new URL("../../", import.meta.url);
const OUT_ROOT = new URL("./cardnews/", PROJECT_ROOT);

async function buildSet(set) {
  const total = 1 + set.items.length + 1; // 표지 + 내용 N장 + CTA
  const dirUrl = new URL(`${String(set.order + 1).padStart(2, "0")}_${set.id}/`, OUT_ROOT);
  const dir = fileURLToPath(dirUrl);
  await mkdir(dir, { recursive: true });

  // 1. 표지
  await renderTo(
    fileURLToPath(new URL("01_cover.png", dirUrl)),
    frame(
      [
        line(set.category, { size: 28, color: SOFT_GOLD, weight: 700 }),
        line(set.title, { size: 60, mt: 26 }),
        line(set.coverSub, { size: 32, color: MUTED, weight: 600, mt: 20 }),
        line("→ 넘겨서 보기", { size: 26, color: SOFT_GOLD, weight: 600, mt: 40 }),
      ],
      { pageIndex: 0, pageTotal: total },
    ),
  );

  // 2. 내용 슬라이드
  for (let i = 0; i < set.items.length; i++) {
    const item = set.items[i];
    const page = i + 1;
    await renderTo(
      fileURLToPath(new URL(`${String(page + 1).padStart(2, "0")}_${item.label}.png`, dirUrl)),
      frame(
        [
          line(item.symbol, { size: 96, color: GOLD, weight: 700 }),
          line(item.label, { size: 34, color: SOFT_GOLD, weight: 700, mt: 12 }),
          keyword(item.keyword),
          line(item.desc, { size: 34, color: IVORY, weight: 500, mt: 34, lineHeight: 1.5 }),
        ],
        { pageIndex: page, pageTotal: total },
      ),
    );
  }

  // 3. CTA
  await renderTo(
    fileURLToPath(new URL(`${String(total).padStart(2, "0")}_cta.png`, dirUrl)),
    frame(
      [
        line(set.ctaLine, { size: 30, color: MUTED, weight: 600 }),
        line(CTA_HEADLINE, { size: 76, color: GOLD, weight: 700, mt: 22 }),
        ctaButton(CTA_BUTTON),
      ],
      { pageIndex: total - 1, pageTotal: total },
    ),
  );

  console.log(`완료: ${set.id} (${total}장) -> ${dir}`);
}

for (const set of CARD_SETS_IN_ORDER) {
  await buildSet(set);
}
