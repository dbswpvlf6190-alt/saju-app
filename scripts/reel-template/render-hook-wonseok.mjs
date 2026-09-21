// "패턴 인터럽트" 훅 구조 전용 릴스 — 결과(임팩트) 먼저 보여주고 되감아서 설명하는 방식.
// 기존 5장면 고정 템플릿(HOOK→INFO→CURIOSITY→SCREENSHOT→CTA)과 구조가 완전히 달라서
// content.mjs/render-scenes.mjs 배치 파이프라인에 넣지 않고 독립 스크립트로 둔다.
//
// v2(2026-09-21): 직관성 개선 — 입력 구간을 실제 앱처럼 큰 카드로, 장면마다 상단 단계 라벨,
// 마스코트/문구 확대 + 배경 광원, CTA는 댓글창·쿠폰 카드 모양으로.
//
// 실행: node scripts/reel-template/render-hook-wonseok.mjs <출력폴더>
import { el, renderTo, GOLD, SOFT_GOLD, IVORY, MUTED } from "./theme.mjs";

const DARK_TEXT = "#1a1530";
const NO_SHADOW = "0 0 0 rgba(0,0,0,0)";

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
  return `data:image/svg+xml;base64,${Buffer.from(mascotSvg(size)).toString("base64")}`;
}

// el()은 div류(type,style,children) 전용이라 img는 Satori가 기대하는 형태(props.src/width/height)로 직접 만든다.
function imgEl(src, width, height, style = { display: "flex" }) {
  return { type: "img", props: { src, width, height, style } };
}

// 기본 폰트가 얇아서 큰 문구가 약해 보임 → 같은 색 그림자로 살짝 굵게(faux bold).
function fauxBold(color, px = 1.6) {
  return `${px}px 0 0 ${color}, -${px}px 0 0 ${color}, 0 ${px}px 0 ${color}, 0 -${px}px 0 ${color}`;
}

const BG_LAYERS =
  "radial-gradient(circle at 50% 46%, rgba(212,175,106,0.22) 0%, rgba(212,175,106,0.06) 38%, rgba(212,175,106,0) 62%), " +
  "linear-gradient(160deg, #0e0b1f 0%, #171331 55%, #0e0b1f 100%)";

// 세이프존(상단 ~300px, 하단 ~400px은 릴스 UI가 덮음) 안쪽에 내용이 오도록 가운데 정렬 + 상단 라벨.
function scene(label, children) {
  return el(
    "div",
    { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundImage: BG_LAYERS, position: "relative" },
    [
      el("div", { position: "absolute", top: 300, left: 0, width: "100%", display: "flex", justifyContent: "center" },
        el("div", {
          display: "flex", padding: "14px 34px", borderRadius: 999, background: "rgba(212,175,106,0.16)",
          border: `2px solid ${GOLD}`, fontSize: 38, fontWeight: 700, color: SOFT_GOLD,
        }, label)),
      el("div", { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", marginTop: 40 }, children),
    ],
  );
}

function text(t, { size = 60, color = IVORY, mt = 0, bold = true, align = "center" } = {}) {
  return el("div", {
    fontSize: size, fontWeight: 700, color, lineHeight: 1.25, textAlign: align, marginTop: mt, display: "flex",
    textShadow: bold ? fauxBold(color, Math.max(1, size / 70)) : NO_SHADOW,
  }, t);
}

function ring(size, opacity) {
  return el("div", {
    position: "absolute", width: size, height: size, borderRadius: "50%", display: "flex",
    border: `3px solid rgba(212,175,106,${opacity})`,
  });
}

// 마스코트 + 뒤에 링 → "결과가 짠 하고 나타나는" 무대
function mascotStage(size, boxSize) {
  return el("div", { position: "relative", width: boxSize, height: boxSize, display: "flex", alignItems: "center", justifyContent: "center" }, [
    ring(boxSize, 0.18),
    ring(Math.round(boxSize * 0.78), 0.34),
    imgEl(mascotDataUri(size), size, size),
  ]);
}

// 1) 첫 플래시 리빌 (0~1s) — 결과부터, 자막이 화면 절반 이상
async function renderScene1(outPath) {
  await renderTo(outPath, scene("🔥 결과 먼저", [
    mascotStage(430, 720),
    text(`"나는원석형"`, { size: 150, color: GOLD, mt: 10 }),
    text("이거 실화냐 😳", { size: 104, color: IVORY, mt: 14 }),
  ]));
}

// ── 실제 앱 입력 화면을 본뜬 카드(공용) ──
function field(labelText, state) {
  // state: "empty" | "focus" | "filled"
  const filled = state === "filled";
  const focus = state === "focus";
  return el("div", {
    width: 250, height: 96, borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center",
    background: filled ? "rgba(212,175,106,0.16)" : "rgba(255,255,255,0.06)",
    border: filled || focus ? `3px solid ${GOLD}` : "2px solid rgba(212,175,106,0.30)",
    boxShadow: focus ? "0 0 32px rgba(212,175,106,0.55)" : NO_SHADOW,
    fontSize: 40, fontWeight: 700, color: filled ? GOLD : MUTED,
  }, labelText);
}

function genderBtn(labelText, selected) {
  return el("div", {
    width: 378, height: 84, borderRadius: 22, display: "flex", alignItems: "center", justifyContent: "center",
    background: selected ? "rgba(212,175,106,0.16)" : "rgba(255,255,255,0.04)",
    border: selected ? `3px solid ${GOLD}` : "2px solid rgba(212,175,106,0.28)",
    fontSize: 36, fontWeight: 700, color: selected ? GOLD : MUTED,
  }, labelText);
}

// stage: 0=빈 폼(되감기), 1=연도, 2=+월, 3=+일·남성, 4=버튼 활성
function appCard(stage) {
  const y = stage >= 1 ? "filled" : "empty";
  const m = stage >= 2 ? "filled" : stage === 1 ? "focus" : "empty";
  const d = stage >= 3 ? "filled" : stage === 2 ? "focus" : "empty";
  const male = stage >= 3;
  const ready = stage >= 4;
  return el("div", {
    width: 900, display: "flex", flexDirection: "column", padding: "48px 56px", borderRadius: 48,
    background: "rgba(23,19,49,0.94)", border: "2px solid rgba(212,175,106,0.38)", boxShadow: "0 40px 90px rgba(0,0,0,0.55)",
  }, [
    el("div", { fontSize: 26, fontWeight: 700, color: SOFT_GOLD, letterSpacing: 4, display: "flex", justifyContent: "center" }, "SAJU LAB · 심리테스트"),
    text("나는 어떤 자연물 유형일까?", { size: 48, color: IVORY, mt: 18 }),
    el("div", { fontSize: 30, fontWeight: 700, color: MUTED, marginTop: 40, display: "flex" }, "생년월일"),
    el("div", { display: "flex", gap: 16, marginTop: 14 }, [
      field(y === "filled" ? "1990년" : "년도", y),
      field(m === "filled" ? "6월" : "월", m),
      field(d === "filled" ? "14일" : "일", d),
    ]),
    el("div", { fontSize: 30, fontWeight: 700, color: MUTED, marginTop: 30, display: "flex" }, "성별"),
    el("div", { display: "flex", gap: 16, marginTop: 14 }, [genderBtn("남성", male), genderBtn("여성", !male)]),
    el("div", {
      marginTop: 34, height: 104, borderRadius: 26, display: "flex", alignItems: "center", justifyContent: "center",
      background: ready ? GOLD : "rgba(212,175,106,0.32)", fontSize: 40, fontWeight: 700, color: ready ? DARK_TEXT : "rgba(243,239,232,0.55)",
      boxShadow: ready ? "0 0 44px rgba(212,175,106,0.6)" : NO_SHADOW,
    }, ready ? "무료로 사주 보기" : "생년월일시를 선택해주세요"),
  ]);
}

// 2) 되감기 — 빈 입력 폼 (1~3s)
async function renderScene2(outPath) {
  await renderTo(outPath, scene("⏪ 되감는 중…", [
    appCard(0),
    text("잠깐, 이게 뭐냐면...", { size: 68, color: SOFT_GOLD, mt: 44 }),
  ]));
}

// 3) 초고속 입력 (3~5s) — 0.5초씩 4컷(연→월→일·성별→버튼)으로 탭하는 느낌
async function renderScene3(outPath, stage) {
  await renderTo(outPath, scene("⏩ 2배속 입력", [
    appCard(stage),
    text("생년월일만 넣으면 됨", { size: 62, color: IVORY, mt: 40 }),
    text("(진짜 30초)", { size: 46, color: GOLD, mt: 8 }),
  ]));
}

// 4) 재리빌 — 처음보다 크고 강하게 (5~9s)
async function renderScene4(outPath) {
  await renderTo(outPath, scene("💎 다시 결과", [
    mascotStage(520, 820),
    text(`"나는원석형" 💎`, { size: 116, color: GOLD, mt: 0 }),
    text("근데 이게...", { size: 52, color: MUTED, mt: 26 }),
    el("div", { display: "flex", alignItems: "center", marginTop: 6, gap: 18 }, [
      text("내 사주랑", { size: 60, color: IVORY }),
      text("소름 돋게 맞음", { size: 60, color: GOLD }),
    ]),
  ]));
}

// 5) 소름 포인트 — 실제 결과 카드 + 핵심 문구 확대 (9~13s)
async function renderScene5(outPath) {
  await renderTo(outPath, scene("🔍 실제 결과 문구", [
    el("div", {
      width: 900, display: "flex", flexDirection: "column", alignItems: "center", padding: "44px 52px 52px", borderRadius: 48,
      background: "rgba(23,19,49,0.94)", border: "2px solid rgba(212,175,106,0.38)", boxShadow: "0 40px 90px rgba(0,0,0,0.55)",
    }, [
      el("div", { fontSize: 24, fontWeight: 700, color: SOFT_GOLD, letterSpacing: 3, display: "flex" }, "나의 사주 심리테스트 결과"),
      imgEl(mascotDataUri(210), 210, 210, { display: "flex", marginTop: 8 }),
      text("나는원석형", { size: 64, color: GOLD, mt: 0 }),
      text("제련되지 않은 강한 원석", { size: 30, color: MUTED, mt: 8, bold: false }),
      el("div", { display: "flex", width: "100%", marginTop: 34, borderLeft: `8px solid ${GOLD}`, paddingLeft: 30, paddingTop: 6, paddingBottom: 6 },
        text("결단력 뚜렷하고 옳다고 믿는 방향으로 밀고 나가는 편", { size: 56, color: IVORY, align: "left" })),
    ]),
    el("div", {
      display: "flex", marginTop: 44, padding: "18px 44px", borderRadius: 999, background: GOLD,
      fontSize: 52, fontWeight: 700, color: DARK_TEXT,
    }, "← 이거 나 맞음 ✅"),
  ]));
}

// 6) CTA — 지시형, 댓글창 + 쿠폰 카드 모양 (13~17s)
async function renderScene6(outPath) {
  await renderTo(outPath, scene("🎟️ 참여 방법", [
    text("팔로우 + 댓글에", { size: 74, color: IVORY }),
    el("div", {
      display: "flex", alignItems: "center", gap: 26, marginTop: 26, padding: "26px 52px", borderRadius: 999,
      background: "rgba(255,255,255,0.07)", border: `3px solid ${GOLD}`, boxShadow: "0 0 50px rgba(212,175,106,0.35)",
    }, [text(`"사주"`, { size: 104, color: GOLD }), text("써봐", { size: 104, color: IVORY })]),
    text("⬇️", { size: 70, mt: 30, bold: false }),
    el("div", {
      display: "flex", flexDirection: "column", alignItems: "center", marginTop: 10, padding: "34px 60px", borderRadius: 36,
      background: "rgba(212,175,106,0.12)", border: `3px dashed ${GOLD}`,
    }, [
      text("🎟️ 무료 쿠폰 링크", { size: 64, color: GOLD }),
      text("DM으로 보내줌", { size: 52, color: IVORY, mt: 8 }),
    ]),
    el("div", {
      display: "flex", flexDirection: "column", alignItems: "center", marginTop: 34, padding: "24px 44px", borderRadius: 28,
      background: "rgba(255,255,255,0.06)", border: "2px solid rgba(212,175,106,0.45)",
    }, [
      text("📜 편당 1,200자 사주 명리 분석", { size: 46, color: IVORY }),
      text("현직 사주 명리 지식 기반", { size: 38, color: SOFT_GOLD, mt: 8, bold: false }),
    ]),
  ]));
}

// 7) 긴급성 + 엔드카드 (17~20s)
async function renderScene7(outPath) {
  const slot = (n) => el("div", {
    width: 96, height: 96, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    background: GOLD, fontSize: 48, fontWeight: 700, color: DARK_TEXT,
  }, String(n));
  await renderTo(outPath, scene("⏰ 이번 주 한정", [
    text("이번 주", { size: 76, color: IVORY }),
    text("5명만 뽑음", { size: 150, color: GOLD, mt: 6 }),
    el("div", { display: "flex", gap: 22, marginTop: 50 }, [1, 2, 3, 4, 5].map(slot)),
    el("div", {
      display: "flex", marginTop: 64, padding: "22px 56px", borderRadius: 999, border: `3px solid ${GOLD}`,
      background: "rgba(212,175,106,0.14)", fontSize: 58, fontWeight: 700, color: IVORY,
    }, "@sajulab_official"),
  ]));
}

export async function renderAll(outDir) {
  await renderScene1(`${outDir}/1.png`);
  await renderScene2(`${outDir}/2.png`);
  for (const [i, k] of ["3a", "3b", "3c", "3d"].entries()) await renderScene3(`${outDir}/${k}.png`, i + 1);
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
