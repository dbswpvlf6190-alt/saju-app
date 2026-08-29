// 사주랩 카드뉴스 템플릿 — 릴스 템플릿(scripts/reel-template/theme.mjs)과 같은 디자인 토큰(남색+금색,
// 링 장식, 좌상단 브랜드 배지)을 재사용하되, 캔버스 비율만 인스타그램 피드/캐러셀 권장 규격(4:5)으로 바꾼다.
import { ImageResponse } from "next/og.js";
import { writeFile } from "node:fs/promises";

export const W = 1080;
export const H = 1350;
export const GOLD = "#d4af6a";
export const SOFT_GOLD = "#e8cf9c";
export const IVORY = "#f3efe8";
export const MUTED = "#b9b3d6";
export const BG = "linear-gradient(160deg, #0e0b1f 0%, #171331 55%, #0e0b1f 100%)";

export const el = (type, style, children) => ({ type, props: { style, children } });

function ring(size, opacity) {
  return el("div", {
    position: "absolute",
    width: size,
    height: size,
    borderRadius: "50%",
    border: `1px solid rgba(212, 175, 106, ${opacity})`,
    display: "flex",
  });
}

function badge() {
  return el(
    "div",
    { position: "absolute", top: 64, left: 64, display: "flex", alignItems: "center", gap: 14 },
    [
      el(
        "div",
        {
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "rgba(212, 175, 106, 0.12)",
          border: `1px solid rgba(212, 175, 106, 0.5)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          fontWeight: 700,
          color: GOLD,
        },
        "四",
      ),
      el("div", { fontSize: 20, fontWeight: 700, color: IVORY, letterSpacing: 2, display: "flex" }, "사주랩"),
    ],
  );
}

function pageDots(index, total) {
  const dots = [];
  for (let i = 0; i < total; i++) {
    dots.push(
      el("div", {
        width: i === index ? 22 : 8,
        height: 8,
        borderRadius: 999,
        background: i === index ? GOLD : "rgba(212, 175, 106, 0.25)",
        display: "flex",
      }),
    );
  }
  return el("div", { position: "absolute", bottom: 56, display: "flex", gap: 8 }, dots);
}

// 캐러셀은 릴스와 달리 상단/하단에 플랫폼 UI가 겹치지 않으므로 세이프존을 넓게 잡을 필요는 없지만,
// 배지·페이지 도트와 겹치지 않도록 위아래 여백만 유지한다.
export function frame(children, { pageIndex, pageTotal } = {}) {
  return el(
    "div",
    { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BG, position: "relative" },
    [
      ring(820, 0.1),
      ring(600, 0.16),
      badge(),
      el(
        "div",
        { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", padding: "0 90px" },
        children,
      ),
      pageTotal ? pageDots(pageIndex, pageTotal) : null,
    ].filter(Boolean),
  );
}

export function eyebrow(text) {
  return el("div", { fontSize: 28, fontWeight: 700, color: SOFT_GOLD, letterSpacing: 4, display: "flex" }, text);
}

export function line(text, { size = 48, color = IVORY, weight = 700, mt = 0, lineHeight = 1.35 } = {}) {
  return el("div", { fontSize: size, fontWeight: weight, color, lineHeight, textAlign: "center", marginTop: mt, display: "flex" }, text);
}

export function lines(arr, opts) {
  return arr.map((t, i) => line(t, { ...opts, mt: i === 0 ? (opts?.mt ?? 0) : 10 }));
}

export function keyword(text) {
  return el("div", { fontSize: 76, fontWeight: 700, color: GOLD, textAlign: "center", marginTop: 28, display: "flex" }, text);
}

export function ctaButton(text) {
  return el(
    "div",
    { marginTop: 44, padding: "26px 46px", borderRadius: 999, background: "rgba(212, 175, 106, 0.14)", border: `2px solid ${GOLD}`, display: "flex" },
    el("div", { fontSize: 34, fontWeight: 700, color: GOLD, display: "flex" }, text),
  );
}

export async function renderTo(path, node) {
  const img = new ImageResponse(node, { width: W, height: H });
  const buffer = Buffer.from(await img.arrayBuffer());
  await writeFile(path, buffer);
}
