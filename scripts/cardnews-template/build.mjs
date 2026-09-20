// 사주랩 카드뉴스 빌드 스크립트 — 세트 하나당 표지+내용+CTA PNG 여러 장을 생성한다.
// 실행: node scripts/cardnews-template/build.mjs
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { frame, line, keyword, ctaButton, renderTo, el, GOLD, SOFT_GOLD, IVORY, MUTED } from "./theme.mjs";
import { CARD_SETS_IN_ORDER, CTA_HEADLINE, CTA_BUTTON } from "./content.mjs";

const PROJECT_ROOT = new URL("../../", import.meta.url);
const OUT_ROOT = new URL("./cardnews/", PROJECT_ROOT);

// 표지 훅: hookAccent가 들어있으면 그 어구만 금색으로 강조한다(첫 장에서 눈이 먼저 갈 지점).
function hookTitle(title, accent) {
  const idx = accent ? title.indexOf(accent) : -1;
  if (idx < 0) return line(title, { size: 72, mt: 26, lineHeight: 1.3 });
  const seg = (text, color) => el("div", { fontSize: 72, fontWeight: 700, color, lineHeight: 1.3, whiteSpace: "pre-wrap", display: "flex" }, text);
  const parts = [seg(title.slice(0, idx), IVORY), seg(accent, GOLD), seg(title.slice(idx + accent.length), IVORY)].filter((_, i) => [title.slice(0, idx), accent, title.slice(idx + accent.length)][i]);
  return el("div", { display: "flex", flexWrap: "wrap", justifyContent: "center", marginTop: 26, textAlign: "center" }, parts);
}

// 파일명에 쓸 수 없는 문자(? / : 등)는 제거한다(새 소재의 label에는 물음표 등이 들어갈 수 있음).
const safeName = (text) => text.replace(/[\/:*?"<>|]/g, "").trim() || "slide";

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
        set.structure === 2 ? hookTitle(set.title, set.hookAccent) : line(set.title, { size: 60, mt: 26 }),
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
      fileURLToPath(new URL(`${String(page + 1).padStart(2, "0")}_${safeName(item.label)}.png`, dirUrl)),
      frame(
        [
          line(item.symbol, { size: 96, color: GOLD, weight: 700 }),
          line(item.label, { size: 34, color: SOFT_GOLD, weight: 700, mt: 12 }),
          // structure 2는 핵심어가 길 수 있어 글자 수에 맞춰 크기를 줄인다(한 글자만 다음 줄로 넘어가는 것 방지). 예전 세트는 76 그대로.
          keyword(item.keyword, set.structure === 2 ? (item.keyword.replace(/\s/g, "").length <= 9 ? 76 : item.keyword.replace(/\s/g, "").length <= 11 ? 64 : 54) : 76),
          line(item.desc, { size: 34, color: IVORY, weight: 500, mt: 34, lineHeight: 1.5 }),
        ],
        { pageIndex: page, pageTotal: total },
      ),
    );
  }

  // 3. CTA — structure 2는 세트마다 CTA 유형(A/B/C)이 달라 set.cta를 쓰고, 예전 세트는 기존 고정 문구
  const cta = set.cta ?? { pre: set.ctaLine, headline: CTA_HEADLINE, button: CTA_BUTTON };
  await renderTo(
    fileURLToPath(new URL(`${String(total).padStart(2, "0")}_cta.png`, dirUrl)),
    frame(
      [
        line(cta.pre, { size: 30, color: MUTED, weight: 600 }),
        line(cta.headline, { size: cta.headline.length > 10 ? 58 : 76, color: GOLD, weight: 700, mt: 22 }),
        ctaButton(cta.button),
      ],
      { pageIndex: total - 1, pageTotal: total },
    ),
  );

  console.log(`완료: ${set.id} (${total}장) -> ${dir}`);
}

for (const set of CARD_SETS_IN_ORDER) {
  await buildSet(set);
}
