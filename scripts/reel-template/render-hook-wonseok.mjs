// "패턴 인터럽트" 훅 구조 전용 릴스 — 결과(임팩트) 먼저 보여주고 되감아서 설명하는 방식.
// 기존 5장면 고정 템플릿(HOOK→INFO→CURIOSITY→SCREENSHOT→CTA)과 구조가 완전히 달라서
// content.mjs/render-scenes.mjs 배치 파이프라인에 넣지 않고 독립 스크립트로 둔다.
// 사용자가 이 스타일을 마음에 들어하면 나중에 정식 템플릿으로 승격 검토.
//
// 실행: node scripts/reel-template/render-hook-wonseok.mjs <출력폴더>
import { el, renderTo, GOLD, SOFT_GOLD, IVORY, MUTED, BG } from "./theme.mjs";

const W = 1080;
const H = 1920;

// WuxingMascot.tsx의 "금(金)" 변형(경/원석형)을 그대로 옮김 — 실제 앱과 동일한 마스코트.
function mascotSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 160 160">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f5f3ec" />
        <stop offset="55%" stop-color="#cfc9b8" />
        <stop offset="100%" stop-color="#8f8a78" />
      </linearGradient>
    </defs>
    <ellipse cx="80" cy="146" rx="34" ry="7" fill="#000" opacity="0.28" />
    <polygon points="80,16 122,48 108,108 80,138 52,108 38,48" fill="url(#g)" />
    <polygon points="80,16 122,48 80,64 38,48" fill="#ffffff" opacity="0.35" />
    <line x1="80" y1="16" x2="80" y2="138" stroke="#8f8a78" stroke-width="1.5" opacity="0.4" />
    <line x1="38" y1="48" x2="122" y2="48" stroke="#8f8a78" stroke-width="1.5" opacity="0.4" />
    <path d="M96 26 L102 34 L96 42 L90 34 Z" fill="#fff" opacity="0.85" />
    <circle cx="66" cy="80" r="6" fill="#3f3c33" />
    <circle cx="94" cy="80" r="6" fill="#3f3c33" />
    <circle cx="68.5" cy="77.5" r="1.8" fill="#fff" />
    <circle cx="96.5" cy="77.5" r="1.8" fill="#fff" />
    <ellipse cx="60" cy="94" rx="7" ry="4" fill="#e0a8a8" opacity="0.5" />
    <ellipse cx="100" cy="94" rx="7" ry="4" fill="#e0a8a8" opacity="0.5" />
    <path d="M69 98 Q80 106 91 98" fill="none" stroke="#3f3c33" stroke-width="4" stroke-linecap="round" />
  </svg>`;
}

function mascotDataUri(size) {
  const svg = mascotSvg(size);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

// el()은 div류(type,style,children) 전용이라 img는 Satori가 기대하는 형태(props.src/width/height)로 직접 만든다.
function imgEl(src, width, height, style = { display: "flex" }) {
  return { type: "img", props: { src, width, height, style } };
}

function bgFrame(children) {
  return el("div", { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: BG, position: "relative" }, children);
}

function bigText(text, { size = 96, color = GOLD, weight = 800, mt = 0 } = {}) {
  return el("div", { fontSize: size, fontWeight: weight, color, lineHeight: 1.25, textAlign: "center", marginTop: mt, display: "flex" }, text);
}

// 1) 첫 플래시 리빌 (0~1s) — 임팩트 있게, 자막이 화면 절반 이상
async function renderScene1(outPath) {
  const img = mascotDataUri(320);
  await renderTo(outPath, bgFrame(
    el("div", { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }, [
      imgEl(img, 320, 320),
      bigText(`"나는원석형"`, { size: 104, mt: 40 }),
      bigText("이거 실화냐 😳", { size: 88, color: IVORY, mt: 16 }),
    ]),
  ));
}

// 2) 되감기 — 빈 입력 폼 (1~3s)
async function renderScene2(outPath) {
  await renderTo(outPath, bgFrame(
    el("div", { display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: "0 90px" }, [
      el("div", { fontSize: 40, fontWeight: 700, color: MUTED, marginBottom: 60, display: "flex" }, "생년월일"),
      el("div", { display: "flex", gap: 20, width: "100%", justifyContent: "center" }, [
        formField("년도"), formField("월"), formField("일"),
      ]),
      el("div", { fontSize: 56, fontWeight: 800, color: SOFT_GOLD, marginTop: 90, textAlign: "center", display: "flex" }, "잠깐, 이게 뭐냐면..."),
    ]),
  ));
}

function formField(label) {
  return el("div", {
    width: 260, height: 96, borderRadius: 20, background: "rgba(255,255,255,0.06)",
    border: "2px solid rgba(212,175,106,0.35)", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 36, fontWeight: 600, color: MUTED,
  }, label);
}

function formFieldFilled(label) {
  return el("div", {
    width: 260, height: 96, borderRadius: 20, background: "rgba(212,175,106,0.14)",
    border: `2px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 36, fontWeight: 800, color: GOLD,
  }, label);
}

// 3) 초고속 입력 — 채워진 폼 (3~5s), 두 서브 상태(연/월만 → 전체)로 나눠서 탭 느낌
async function renderScene3(outPath, stage) {
  const y = stage >= 1 ? "1990년" : "년도";
  const m = stage >= 1 ? "6월" : "월";
  const d = stage >= 2 ? "14일" : "일";
  const F = stage >= 1 ? formFieldFilled : formField;
  const Fd = stage >= 2 ? formFieldFilled : formField;
  await renderTo(outPath, bgFrame(
    el("div", { display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: "0 90px" }, [
      el("div", { fontSize: 40, fontWeight: 700, color: MUTED, marginBottom: 60, display: "flex" }, "생년월일"),
      el("div", { display: "flex", gap: 20, width: "100%", justifyContent: "center" }, [
        F(y), F(m), Fd(d),
      ]),
      el("div", { display: "flex", gap: 20, marginTop: 40 }, [
        el("div", {
          width: 160, height: 76, borderRadius: 999, background: stage >= 3 ? "rgba(212,175,106,0.14)" : "rgba(255,255,255,0.06)",
          border: stage >= 3 ? `2px solid ${GOLD}` : "2px solid rgba(212,175,106,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 700,
          color: stage >= 3 ? GOLD : MUTED,
        }, "남성"),
      ]),
      el("div", { fontSize: 52, fontWeight: 800, color: SOFT_GOLD, marginTop: 90, textAlign: "center", display: "flex" }, "생년월일만 넣으면 됨"),
      el("div", { fontSize: 40, fontWeight: 700, color: MUTED, marginTop: 14, textAlign: "center", display: "flex" }, "(진짜 30초)"),
    ]),
  ));
}

// 4) 재리빌 — 처음보다 크고 강하게 (5~9s)
async function renderScene4(outPath) {
  const img = mascotDataUri(420);
  await renderTo(outPath, bgFrame(
    el("div", { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }, [
      imgEl(img, 420, 420),
      bigText(`"나는원석형" 💎`, { size: 128, mt: 44 }),
      bigText("근데 이게... 내 사주랑 소름 돋게 맞음", { size: 46, color: IVORY, weight: 600, mt: 30 }),
    ]),
  ));
}

// 5) 소름 포인트 — 실제 결과 텍스트 확대 (9~13s)
async function renderScene5(outPath) {
  await renderTo(outPath, bgFrame(
    el("div", { display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: "0 90px" }, [
      el("div", { fontSize: 34, fontWeight: 700, color: SOFT_GOLD, marginBottom: 40, display: "flex" }, "나는원석형 · 실제 결과"),
      el("div", {
        display: "flex", padding: "56px 48px", borderRadius: 32, background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(212,175,106,0.35)", boxShadow: "0 30px 60px rgba(0,0,0,0.45)",
      }, el("div", { fontSize: 58, fontWeight: 700, color: IVORY, lineHeight: 1.5, textAlign: "center", display: "flex" },
        "결단력 뚜렷하고 옳다고 믿는 방향으로 밀고 나가는 편")),
      el("div", { fontSize: 44, fontWeight: 800, color: GOLD, marginTop: 44, display: "flex" }, "← 이거 나 맞음"),
    ]),
  ));
}

// 6) CTA — 지시형, 화면 꽉 차게 (13~17s)
async function renderScene6(outPath) {
  await renderTo(outPath, bgFrame(
    el("div", { display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: "0 80px" }, [
      bigText("팔로우 + 댓글에", { size: 72, color: IVORY, mt: 0 }),
      bigText(`"사주" 써봐`, { size: 96, color: GOLD, mt: 20 }),
      el("div", { fontSize: 44, fontWeight: 700, color: SOFT_GOLD, marginTop: 60, textAlign: "center", display: "flex" }, "무료 쿠폰 링크 DM으로 보내줌 🎟️"),
    ]),
  ));
}

// 7) 긴급성 + 엔드카드 (17~20s)
async function renderScene7(outPath) {
  await renderTo(outPath, bgFrame(
    el("div", { display: "flex", flexDirection: "column", alignItems: "center" }, [
      bigText("이번 주 5명만 뽑음", { size: 80, color: GOLD }),
      el("div", { fontSize: 44, fontWeight: 700, color: IVORY, marginTop: 46, display: "flex" }, "@sajulab_official"),
    ]),
  ));
}

export async function renderAll(outDir) {
  await renderScene1(`${outDir}/1.png`);
  await renderScene2(`${outDir}/2.png`);
  await renderScene3(`${outDir}/3a.png`, 1);
  await renderScene3(`${outDir}/3b.png`, 3);
  await renderScene4(`${outDir}/4.png`);
  await renderScene5(`${outDir}/5.png`);
  await renderScene6(`${outDir}/6.png`);
  await renderScene7(`${outDir}/7.png`);
}

if (process.argv[1] && process.argv[1].endsWith("render-hook-wonseok.mjs")) {
  const outDir = process.argv[2];
  if (!outDir) throw new Error("사용법: node render-hook-wonseok.mjs <출력폴더>");
  const { mkdir } = await import("node:fs/promises");
  await mkdir(outDir, { recursive: true });
  await renderAll(outDir);
  console.log("장면 렌더링 완료:", outDir);
}
