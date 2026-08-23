// 사주랩 릴스 템플릿 시스템 — 빌드 스크립트
// content.mjs의 각 항목에 대해 5장면 PNG를 렌더링하고, R25와 동일한 브랜드 오디오 시스템으로
// 영상을 조립해 /reels 폴더에 "{업로드순서}_{코드}_{카테고리}.mp4" 형식으로 저장한다.
//
// 실행: node scripts/reel-template/build.mjs
import { mkdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { REELS_IN_UPLOAD_ORDER } from "./content.mjs";
import { renderScenes } from "./render-scenes.mjs";

const PROJECT_ROOT = new URL("../../", import.meta.url);
const OUT_DIR = new URL("./reels/", PROJECT_ROOT);
const TMP_ROOT = new URL("./scripts/reel-template/.tmp/", PROJECT_ROOT);

// 고정 장면 타임라인(초): HOOK / INFO / CURIOSITY / SCREENSHOT / CTA
const D = [2, 5, 3, 3, 4];
const FADE = 0.2;

function cumulativeOffsets(durations, fade) {
  let dur = durations[0];
  const offsets = [];
  for (let i = 1; i < durations.length; i++) {
    offsets.push(dur - fade);
    dur = dur + durations[i] - fade;
  }
  return { offsets, total: dur };
}

const { offsets, total } = cumulativeOffsets(D, FADE);
// offsets = [o1, o2, o3, o4] 각 xfade 시작 지점
// o3 = 커리오시티→스크린샷 전환, o4 = 스크린샷→CTA 전환
const [o1, o2, o3, o4] = offsets;
const chordFadeStart = 6;
const chordFadeDur = 3;
const ctaDingAt = o4 + 1.3;
const finalFadeOutStart = total - 2.0;

function buildVideoFilter() {
  const frames = D.map((d) => Math.round(d * 30));
  const zoom = frames.map((f, i) => {
    const maxZoom = 1.03 + i * 0.008;
    return `[${i}:v]zoompan=z='min(zoom+0.0005,${maxZoom.toFixed(3)})':d=${f}:s=1080x1920:fps=30[v${i}]`;
  });
  const xfades = [
    `[v0][v1]xfade=transition=fade:duration=${FADE}:offset=${o1.toFixed(2)}[x1]`,
    `[x1][v2]xfade=transition=fade:duration=${FADE}:offset=${o2.toFixed(2)}[x2]`,
    `[x2][v3]xfade=transition=fade:duration=${FADE}:offset=${o3.toFixed(2)}[x3]`,
    `[x3][v4]xfade=transition=fade:duration=${FADE}:offset=${o4.toFixed(2)}[vout]`,
  ];
  return [...zoom, ...xfades].join(";");
}

function buildAudioFilter() {
  const whooshMs1 = Math.round(o3 * 1000);
  const whooshMs2 = Math.round(o4 * 1000);
  const dingMs1 = Math.round(ctaDingAt * 1000);
  const dingMs2 = Math.round((ctaDingAt + 0.2) * 1000);
  return [
    `[5:a]volume=0.40[c1n1]`,
    `[6:a]volume=0.34[c1n2]`,
    `[7:a]volume=0.28[c1n3]`,
    `[c1n1][c1n2][c1n3]amix=inputs=3:duration=longest:normalize=0[chord1raw]`,
    `[chord1raw]afade=t=out:st=${chordFadeStart}:d=${chordFadeDur}[chord1]`,
    `[8:a]volume=0.30[c2n1]`,
    `[9:a]volume=0.34[c2n2]`,
    `[10:a]volume=0.28[c2n3]`,
    `[c2n1][c2n2][c2n3]amix=inputs=3:duration=longest:normalize=0[chord2raw]`,
    `[chord2raw]afade=t=in:st=${chordFadeStart}:d=${chordFadeDur}[chord2]`,
    `[11:a]lowpass=f=800,highpass=f=80,volume=0.06[air]`,
    `[12:a]volume=0.07,afade=t=out:st=0.08:d=0.12,adelay=0|0[hk1]`,
    `[13:a]volume=0.07,afade=t=out:st=0.08:d=0.14,adelay=120|120[hk2]`,
    `[14:a]volume=0.09,afade=t=out:st=0.1:d=0.6,adelay=260|260[hk3]`,
    `[hk1][hk2][hk3]amix=inputs=3:duration=longest:normalize=0[hookarp]`,
    `[15:a]volume=0.06,afade=t=out:st=0.08:d=0.3,adelay=${dingMs1}|${dingMs1}[cd1]`,
    `[16:a]volume=0.06,afade=t=out:st=0.08:d=0.35,adelay=${dingMs2}|${dingMs2}[cd2]`,
    `[cd1][cd2]amix=inputs=2:duration=longest:normalize=0[ctading]`,
    `[17:a]highpass=f=300,lowpass=f=3000,volume=0.08,afade=t=in:st=0:d=0.05,afade=t=out:st=0.2:d=0.15,adelay=${whooshMs1}|${whooshMs1}[whoosh1]`,
    `[18:a]highpass=f=300,lowpass=f=3000,volume=0.08,afade=t=in:st=0:d=0.05,afade=t=out:st=0.2:d=0.15,adelay=${whooshMs2}|${whooshMs2}[whoosh2]`,
    `[chord1][chord2][air][hookarp][ctading][whoosh1][whoosh2]amix=inputs=7:duration=longest:dropout_transition=0:normalize=0[premono]`,
    `[premono]aecho=0.6:0.4:150|260:0.15|0.09[premastermono]`,
    `[premastermono]pan=stereo|c0=c0|c1=c0[stereoin]`,
    `[stereoin]haas[premasterstereo]`,
    `[premasterstereo]afade=t=in:st=0:d=1.0,afade=t=out:st=${finalFadeOutStart.toFixed(2)}:d=2.0,alimiter=limit=0.8[aout]`,
  ].join(";");
}

async function buildOne(entry) {
  const code = String(entry.order).padStart(2, "0");
  const fileName = `${code}_${entry.id}_${entry.category}.mp4`;
  const sceneDir = new URL(`./${entry.id}/`, TMP_ROOT);
  await mkdir(sceneDir, { recursive: true });
  const sceneDirPath = fileURLToPath(sceneDir).replace(/[\\/]$/, "");

  await renderScenes(entry, sceneDirPath);

  const videoFilter = buildVideoFilter();
  const audioFilter = buildAudioFilter();
  const filterComplex = `${videoFilter};${audioFilter}`;

  const args = [
    "-y",
    "-loop", "1", "-framerate", "30", "-t", String(D[0]), "-i", `${sceneDirPath}/1-hook.png`,
    "-loop", "1", "-framerate", "30", "-t", String(D[1]), "-i", `${sceneDirPath}/2-info.png`,
    "-loop", "1", "-framerate", "30", "-t", String(D[2]), "-i", `${sceneDirPath}/3-curiosity.png`,
    "-loop", "1", "-framerate", "30", "-t", String(D[3]), "-i", `${sceneDirPath}/4-screenshot.png`,
    "-loop", "1", "-framerate", "30", "-t", String(D[4]), "-i", `${sceneDirPath}/5-cta.png`,
    "-f", "lavfi", "-t", "20", "-i", "sine=frequency=110",
    "-f", "lavfi", "-t", "20", "-i", "sine=frequency=130.81",
    "-f", "lavfi", "-t", "20", "-i", "sine=frequency=164.81",
    "-f", "lavfi", "-t", "20", "-i", "sine=frequency=87.31",
    "-f", "lavfi", "-t", "20", "-i", "sine=frequency=110",
    "-f", "lavfi", "-t", "20", "-i", "sine=frequency=130.81",
    "-f", "lavfi", "-t", "20", "-i", "anoisesrc=color=pink",
    "-f", "lavfi", "-t", "0.8", "-i", "sine=frequency=783.99",
    "-f", "lavfi", "-t", "0.8", "-i", "sine=frequency=987.77",
    "-f", "lavfi", "-t", "0.8", "-i", "sine=frequency=1318.51",
    "-f", "lavfi", "-t", "0.8", "-i", "sine=frequency=1318.51",
    "-f", "lavfi", "-t", "0.8", "-i", "sine=frequency=1567.98",
    "-f", "lavfi", "-t", "0.35", "-i", "anoisesrc=color=pink",
    "-f", "lavfi", "-t", "0.35", "-i", "anoisesrc=color=pink",
    "-filter_complex", filterComplex,
    "-map", "[vout]", "-map", "[aout]",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "44100",
    "-shortest", "-movflags", "+faststart",
    fileURLToPath(new URL(fileName, OUT_DIR)),
  ];

  execFileSync("ffmpeg", args, { stdio: ["ignore", "ignore", "ignore"] });
  console.log(`done: ${fileName}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(TMP_ROOT, { recursive: true });
  for (const entry of REELS_IN_UPLOAD_ORDER) {
    await buildOne(entry);
  }
  await rm(TMP_ROOT, { recursive: true, force: true });
  console.log(`\n총 ${REELS_IN_UPLOAD_ORDER.length}개 릴스 생성 완료 → /reels (영상 총 길이 약 ${total.toFixed(1)}초 각각)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
