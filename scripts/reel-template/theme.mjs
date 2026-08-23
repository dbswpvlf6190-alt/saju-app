// 사주랩 릴스 템플릿 시스템 — 공유 디자인 토큰 & 렌더 헬퍼
// R25_REELS_FINAL의 디자인 시스템(남색+금색, 링 장식, 좌상단 브랜드 배지, 세이프존)을 그대로 재사용합니다.
import { ImageResponse } from "next/og.js";
import { writeFile, readFile } from "node:fs/promises";

export const W = 1080;
export const H = 1920;
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
    { position: "absolute", top: 96, left: 90, display: "flex", alignItems: "center", gap: 16 },
    [
      el(
        "div",
        {
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "rgba(212, 175, 106, 0.12)",
          border: `1px solid rgba(212, 175, 106, 0.5)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          fontWeight: 700,
          color: GOLD,
        },
        "四",
      ),
      el("div", { fontSize: 24, fontWeight: 700, color: IVORY, letterSpacing: 2, display: "flex" }, "사주랩"),
    ],
  );
}

// 세이프존: 상단 약 300px / 하단 약 400px를 비워 Reels UI(캡션·유저네임·아이콘)와 겹치지 않게 한다.
export function frame(children) {
  return el(
    "div",
    { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BG, position: "relative" },
    [ring(1000, 0.1), ring(760, 0.16), badge(), el(
      "div",
      { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", padding: "0 100px", marginTop: 40 },
      children,
    )],
  );
}

export function line(text, { size = 56, color = IVORY, weight = 700, mt = 0 } = {}) {
  return el("div", { fontSize: size, fontWeight: weight, color, lineHeight: 1.3, textAlign: "center", marginTop: mt, display: "flex" }, text);
}

export function lines(arr, opts) {
  return arr.map((t, i) => line(t, { ...opts, mt: i === 0 ? (opts?.mt ?? 0) : 10 }));
}

export function ctaButton(text) {
  return el(
    "div",
    { marginTop: 48, padding: "28px 50px", borderRadius: 999, background: "rgba(212, 175, 106, 0.14)", border: `2px solid ${GOLD}`, display: "flex" },
    el("div", { fontSize: 38, fontWeight: 700, color: GOLD, display: "flex" }, text),
  );
}

export async function renderTo(path, node) {
  const img = new ImageResponse(node, { width: W, height: H });
  const buffer = Buffer.from(await img.arrayBuffer());
  await writeFile(path, buffer);
}

let screenshotDataUriCache = null;
export async function getScreenshotDataUri() {
  if (!screenshotDataUriCache) {
    const buf = await readFile(new URL("./assets/result-screen-crop.png", import.meta.url));
    screenshotDataUriCache = `data:image/png;base64,${buf.toString("base64")}`;
  }
  return screenshotDataUriCache;
}
