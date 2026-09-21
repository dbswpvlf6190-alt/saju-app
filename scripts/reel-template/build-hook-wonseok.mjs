// "패턴 인터럽트" 훅 릴스 — 렌더링된 PNG를 ffmpeg로 조립한다.
// 구조: 결과 플래시(1s) → 되감기/빈 폼(2s) → 초고속 입력 4컷(2s) → 임팩트 플래시 → 재리빌(3.9s)
//       → 소름 텍스트(4s) → CTA(4s) → 엔드카드(3s), 총 20초. 나레이션 없음(자막+효과음).
// 실행: node scripts/reel-template/build-hook-wonseok.mjs
import { mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { renderAll } from "./render-hook-wonseok.mjs";

const PROJECT_ROOT = new URL("../../", import.meta.url);
const OUT_PATH = fileURLToPath(new URL("./reels/hook_wonseok_type.mp4", PROJECT_ROOT));
const TMP_DIR = fileURLToPath(new URL("./scripts/reel-template/.tmp/hook_wonseok/", PROJECT_ROOT));

const FPS = 30;

// zoompan은 "입력 프레임 1장"에서 d개의 출력 프레임을 만든다 → 그림 입력은 -loop/-t 없이 1프레임만 넣는다
// (걸면 프레임이 곱연산으로 폭발해 20초가 31분/수백MB로 나옴, 2026-09-18/21 실제로 겪음).
// 길이는 zoompan의 d= 하나로만 정한다.
function zoomExpr(zStart, zEnd, frames) {
  return zEnd > zStart ? `min(zoom+${((zEnd - zStart) / frames).toFixed(5)},${zEnd})` : `${zStart}`;
}

// 장면 정의(순서 = 타임라인 순서)
const SEGMENTS = [
  // 첫 리빌: 크게 들어왔다가 제자리로 "쾅" 안착하는 느낌
  { id: "s1", file: "1.png", d: 1.0, zoom: "if(lte(on,1),1.12,max(1.0,zoom-0.02))" },
  { id: "s2", file: "2.png", d: 2.0, z: [1.0, 1.03] },
  { id: "s3a", file: "3a.png", d: 0.5, z: [1.0, 1.02] },
  { id: "s3b", file: "3b.png", d: 0.5, z: [1.0, 1.02] },
  { id: "s3c", file: "3c.png", d: 0.5, z: [1.0, 1.02] },
  { id: "s3d", file: "3d.png", d: 0.5, z: [1.0, 1.02] },
  { id: "flash", flash: true, d: 0.1 },
  // 재리빌: 크게 들어왔다가 1.03배에 안착(슬램) + 초반 0.6초 흔들림
  { id: "s4", file: "4.png", d: 3.9, zoom: "if(lte(on,1),1.22,max(1.03,zoom-0.02))", shake: true },
  { id: "s5", file: "5.png", d: 4.0, z: [1.0, 1.1] },
  { id: "s6", file: "6.png", d: 4.0, z: [1.0, 1.04] },
  { id: "s7", file: "7.png", d: 3.0, z: [1.0, 1.0] },
];

function startOf(id) {
  let t = 0;
  for (const s of SEGMENTS) {
    if (s.id === id) return t;
    t += s.d;
  }
  throw new Error(id);
}

// 합성 효과음(저작권 문제 없음). [라벨, 소스, 필터, 볼륨, 시작(초)]
function buildSfx() {
  const whoosh = (fadeIn = 0.15) =>
    `anoisesrc=r=44100:c=pink:d=0.45,highpass=f=400,lowpass=f=4200,afade=t=in:st=0:d=${fadeIn},afade=t=out:st=0.22:d=0.22`;
  const tick = (f) => `sine=f=${f}:r=44100:d=0.06,afade=t=out:st=0.01:d=0.05`;
  const ding = (f, d) => `sine=f=${f}:r=44100:d=${d},afade=t=out:st=0.04:d=${d - 0.04}`;
  const t4 = startOf("s4") - 0.1; // 플래시 시작 = 재리빌 임팩트 지점
  const tCta = startOf("s6");
  return [
    // 첫 리빌 임팩트(약하게)
    [`sine=f=80:r=44100:d=0.4,afade=t=out:st=0.03:d=0.37`, "", 0.55, 0],
    // 되감기 휘익
    [whoosh(0.2), "", 0.22, startOf("s2") - 0.15],
    // 입력 탭 소리 4번(마지막은 버튼 누름 = 더 높고 굵게)
    [tick(1800), "", 0.28, startOf("s3a")],
    [tick(1800), "", 0.28, startOf("s3b")],
    [tick(1800), "", 0.28, startOf("s3c")],
    [tick(2400), "", 0.32, startOf("s3d")],
    [`sine=f=300:r=44100:d=0.1,afade=t=out:st=0.01:d=0.09`, "", 0.3, startOf("s3d")],
    // 재리빌 직전 라이저 + 임팩트 3겹(저음/저역 노이즈/반짝임)
    [whoosh(0.35), "", 0.3, t4 - 0.25],
    [`sine=f=70:r=44100:d=0.8,afade=t=out:st=0.05:d=0.75`, "", 0.95, t4],
    [`anoisesrc=r=44100:c=brown:d=0.5,lowpass=f=300,afade=t=out:st=0.03:d=0.47`, "", 0.7, t4],
    [`sine=f=2093:r=44100:d=0.6,afade=t=out:st=0.03:d=0.57`, "", 0.10, t4 + 0.02],
    // 텍스트 확대/CTA/엔드카드 전환 휘익
    [whoosh(0.1), "", 0.18, startOf("s5") - 0.1],
    [whoosh(0.1), "", 0.18, tCta - 0.1],
    [whoosh(0.1), "", 0.16, startOf("s7") - 0.1],
    // CTA 딩(2음) + 엔드카드 딩
    [ding(1318.51, 0.5), "", 0.25, tCta + 0.05],
    [ding(1567.98, 0.6), "", 0.25, tCta + 0.2],
    [ding(1046.5, 0.8), "", 0.22, startOf("s7") + 0.05],
  ].map(([src, , vol, at]) => ({ src, vol, at }));
}

async function main() {
  await mkdir(TMP_DIR, { recursive: true });
  await renderAll(TMP_DIR);

  const totalDur = SEGMENTS.reduce((a, s) => a + s.d, 0);

  const inputs = [];
  const vf = [];
  SEGMENTS.forEach((s, i) => {
    const frames = Math.max(1, Math.round(s.d * FPS));
    if (s.flash) {
      // 1x1 PNG는 검정으로 나와서(2026-09-21 확인) 색 소스로 직접 만든다 — 임팩트 컷은 밝은 웜화이트.
      inputs.push("-f", "lavfi", "-t", String(s.d), "-i", `color=c=0xFFF4D6:s=1080x1920:r=${FPS}`);
      vf.push(`[${i}:v]format=yuv420p,setsar=1,fps=${FPS}[v${i}]`);
      return;
    }
    inputs.push("-i", `${TMP_DIR}/${s.file}`);
    const z = s.zoom ?? zoomExpr(s.z[0], s.z[1], frames);
    const zp = `zoompan=z='${z}':d=${frames}:s=1080x1920:fps=${FPS}`;
    if (s.shake) {
      vf.push(`[${i}:v]scale=1080:1920,${zp}[v${i}z]`);
      vf.push(`[v${i}z]rotate='if(lt(t,0.6),0.025*sin(2*PI*9*t)*(1-t/0.6),0)':c=none:ow=1080:oh=1920[v${i}]`);
    } else {
      vf.push(`[${i}:v]scale=1080:1920,${zp}[v${i}]`);
    }
  });
  // 전부 하드컷 — 훅 스타일은 크로스페이드보다 컷이 더 빠르고 강하게 읽힘
  vf.push(`${SEGMENTS.map((_, i) => `[v${i}]`).join("")}concat=n=${SEGMENTS.length}:v=1:a=0[vout]`);

  const sfx = buildSfx();
  const af = [`anullsrc=r=44100:cl=stereo,atrim=0:${totalDur.toFixed(2)}[base]`];
  const labels = ["[base]"];
  sfx.forEach((e, i) => {
    const ms = Math.max(0, Math.round(e.at * 1000));
    af.push(`${e.src},aformat=sample_rates=44100:channel_layouts=stereo,volume=${e.vol},adelay=${ms}|${ms}[e${i}]`);
    labels.push(`[e${i}]`);
  });
  // 은은한 배경 화음(브랜드 톤) — 처음 1초 페이드인, 마지막 2초 페이드아웃
  af.push(`sine=f=110:r=44100:d=${totalDur},aformat=sample_rates=44100:channel_layouts=stereo,volume=0.05[bed1]`);
  af.push(`sine=f=164.81:r=44100:d=${totalDur},aformat=sample_rates=44100:channel_layouts=stereo,volume=0.04[bed2]`);
  af.push(`[bed1][bed2]amix=inputs=2:duration=first:normalize=0,afade=t=in:st=0:d=1,afade=t=out:st=${(totalDur - 2).toFixed(2)}:d=2[bed]`);
  labels.push("[bed]");
  af.push(`${labels.join("")}amix=inputs=${labels.length}:duration=first:normalize=0,alimiter=limit=0.9[aout]`);

  const args = [
    "-y",
    ...inputs,
    "-filter_complex", `${vf.join(";")};${af.join(";")}`,
    "-map", "[vout]", "-map", "[aout]",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "44100",
    "-shortest", "-movflags", "+faststart",
    OUT_PATH,
  ];

  execFileSync("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  console.log(`done: ${OUT_PATH} (약 ${totalDur.toFixed(1)}초)`);
}

main().catch((err) => {
  console.error(err.stderr ? err.stderr.toString().slice(-3000) : err);
  process.exit(1);
});
