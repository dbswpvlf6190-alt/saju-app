// 사주랩 릴스 템플릿 시스템 — 장면 렌더러
// 콘텐츠 항목(content.mjs) 하나를 받아 5장 PNG(HOOK/INFO/CURIOSITY/SCREENSHOT/CTA)를 생성한다.
import { frame, line, lines, ctaButton, renderTo, getScreenshotDataUri, GOLD, SOFT_GOLD, IVORY, MUTED } from "./theme.mjs";
import { CTA_HEADLINE, CTA_BUTTON } from "./content.mjs";

export async function renderScenes(entry, outDir) {
  // 1. HOOK (0~2s)
  await renderTo(`${outDir}/1-hook.png`, frame(lines(entry.hook, { size: 84, weight: 700 })));

  // 2. INFO (2~7s) — 핵심 키워드만 금색 강조
  await renderTo(
    `${outDir}/2-info.png`,
    frame([
      line(entry.categoryLabel, { size: 32, color: SOFT_GOLD, weight: 700 }),
      line(entry.info.pre, { size: 48, color: MUTED, weight: 600, mt: 22 }),
      line(entry.info.emphasis, { size: 72, color: GOLD, weight: 700, mt: 18 }),
      line(entry.info.post, { size: 48, color: IVORY, weight: 600, mt: 18 }),
      ...(entry.info.sub ? [
        line(entry.info.sub[0], { size: 32, color: MUTED, weight: 600, mt: 34 }),
        line(entry.info.sub[1], { size: 32, color: MUTED, weight: 600, mt: 4 }),
      ] : []),
    ]),
  );

  // 3. CURIOSITY (7~10s)
  await renderTo(`${outDir}/3-curiosity.png`, frame(lines(entry.curiosity, { size: 68, color: IVORY, weight: 700 })));

  // 4. 실제 앱 화면 (10~13s)
  const screenshotDataUri = await getScreenshotDataUri();
  const shotW = 900;
  const shotH = Math.round(960 * (900 / 1290));
  await renderTo(
    `${outDir}/4-screenshot.png`,
    frame([
      line("사주랩 실제 서비스 화면", { size: 34, color: SOFT_GOLD, weight: 700 }),
      {
        type: "div",
        props: {
          style: {
            marginTop: 28,
            width: shotW,
            height: shotH,
            borderRadius: 28,
            overflow: "hidden",
            border: "1px solid rgba(212, 175, 106, 0.35)",
            boxShadow: "0 30px 60px rgba(0,0,0,0.45)",
            display: "flex",
          },
          children: { type: "img", props: { src: screenshotDataUri, width: shotW, height: shotH, style: { objectFit: "cover", display: "flex" } } },
        },
      },
      line(entry.screenshotCaption, { size: 32, color: MUTED, weight: 600, mt: 28 }),
    ]),
  );

  // 5. CTA (13~17s)
  await renderTo(
    `${outDir}/5-cta.png`,
    frame([
      line(`${entry.categoryLabel} 궁금증, 풀렸나요?`, { size: 32, color: MUTED, weight: 600 }),
      line(CTA_HEADLINE, { size: 88, color: GOLD, weight: 700, mt: 26 }),
      ctaButton(CTA_BUTTON),
    ]),
  );
}
