// 사주랩 릴스 템플릿 시스템 — 빌드 스크립트
// content.mjs의 각 항목에 대해 5장면 PNG를 렌더링하고, R25와 동일한 브랜드 오디오 시스템으로
// 영상을 조립해 /reels 폴더에 "{업로드순서}_{코드}_{카테고리}.mp4" 형식으로 저장한다.
//
// 2026-09-06: 음성 나레이션 추가. 이전엔 5장면(HOOK/INFO/CURIOSITY/SCREENSHOT/CTA)이 전부
// 고정 길이(2/5/3/3/4초)인 무음 텍스트 카드였는데, HOOK 2초 안에 텍스트 3~4줄을 읽어야 해서
// 부담이 크다는 점 + 소리 없이 텍스트만 있는 게 경쟁 콘텐츠 대비 약하다는 점이 지적됨.
// edge-tts로 장면별 나레이션을 생성하고, 그 실제 길이에 맞춰 장면 길이를 정해서 두 문제를 같이 푼다.
//
// 실행: node scripts/reel-template/build.mjs
import { mkdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { REELS_IN_UPLOAD_ORDER, CTA_NARRATION } from "./content.mjs";
import { renderScenes } from "./render-scenes.mjs";

const PROJECT_ROOT = new URL("../../", import.meta.url);
const OUT_DIR = new URL("./reels/", PROJECT_ROOT);
const TMP_ROOT = new URL("./scripts/reel-template/.tmp/", PROJECT_ROOT);

const FADE = 0.2;
const VOICE = "ko-KR-SunHiNeural";
const VOICE_RATE = "+20%";
// 나레이션 실제 길이 + 이 여유(초)를 장면 길이로 쓴다 — 말 끝나자마자 바로 전환되면 급해 보여서 약간 숨 쉴 틈을 둠.
const SCENE_PAD = 0.3;
// 아무리 짧은 나레이션이어도 장면이 너무 순식간에 지나가면 어색하니 최소 길이를 둔다.
const MIN_SCENE = 1.5;

function cumulativeOffsets(durations, fade) {
  let dur = durations[0];
  const offsets = [];
  for (let i = 1; i < durations.length; i++) {
    offsets.push(dur - fade);
    dur = dur + durations[i] - fade;
  }
  return { offsets, total: dur };
}

function synthesize(text, outPath) {
  execFileSync(
    "edge-tts",
    ["--voice", VOICE, "--rate", VOICE_RATE, "--text", text, "--write-media", outPath],
    { stdio: ["ignore", "ignore", "ignore"] },
  );
}

function probeDuration(path) {
  const out = execFileSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path,
  ]).toString().trim();
  return parseFloat(out);
}

function narrationTexts(entry) {
  const { info } = entry;
  return {
    hook: entry.hook.join(" "),
    info: `${info.pre} ${info.emphasis} ${info.post}. ${info.sub.join(" ")}`,
    curiosity: entry.curiosity.join(" "),
    screenshot: entry.screenshotCaption,
    cta: CTA_NARRATION,
  };
}

function buildVideoFilter(D, offsets) {
  const [o1, o2, o3, o4] = offsets;
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

// 나레이션 5개(입력 인덱스 19~23)를 각 장면 시작 시점에 맞춰 깔고, 클린한 상태로(잔향 없이) 하나로 합친다.
function buildNarrationFilter(sceneStarts) {
  const delays = sceneStarts.map((s) => Math.round(s * 1000));
  const tracks = delays.map((ms, i) => `[${19 + i}:a]adelay=${ms}|${ms}[n${i}]`);
  return [
    ...tracks,
    `[n0][n1][n2][n3][n4]amix=inputs=5:duration=longest:normalize=0,volume=1.6[narrmix]`,
    `[narrmix]pan=stereo|c0=c0|c1=c0[narrstereo]`,
  ].join(";");
}

function buildAudioFilter(D, offsets, total) {
  const [, , o3, o4] = offsets;
  // 브랜드 배경음(코드 전환 타이밍)은 총 길이가 장면별로 달라지므로 INFO→CURIOSITY 전환(o2)에 맞춘다.
  const chordFadeStart = Math.max(1, offsets[1] - 1);
  const chordFadeDur = Math.min(3, Math.max(0.8, total - chordFadeStart - 1));
  const ctaDingAt = o4 + Math.min(1.3, D[4] * 0.4);
  const finalFadeOutStart = Math.max(0, total - 2.0);
  const whooshMs1 = Math.round(o3 * 1000);
  const whooshMs2 = Math.round(o4 * 1000);
  const dingMs1 = Math.round(ctaDingAt * 1000);
  const dingMs2 = Math.round((ctaDingAt + 0.2) * 1000);
  return [
    `[5:a]volume=0.40[c1n1]`,
    `[6:a]volume=0.34[c1n2]`,
    `[7:a]volume=0.28[c1n3]`,
    `[c1n1][c1n2][c1n3]amix=inputs=3:duration=longest:normalize=0[chord1raw]`,
    `[chord1raw]afade=t=out:st=${chordFadeStart.toFixed(2)}:d=${chordFadeDur.toFixed(2)}[chord1]`,
    `[8:a]volume=0.30[c2n1]`,
    `[9:a]volume=0.34[c2n2]`,
    `[10:a]volume=0.28[c2n3]`,
    `[c2n1][c2n2][c2n3]amix=inputs=3:duration=longest:normalize=0[chord2raw]`,
    `[chord2raw]afade=t=in:st=${chordFadeStart.toFixed(2)}:d=${chordFadeDur.toFixed(2)}[chord2]`,
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
    `[chord1][chord2][air][hookarp][ctading][whoosh1][whoosh2]amix=inputs=7:duration=longest:dropout_transition=0:normalize=0,volume=0.55[bed]`,
    // 잔향(echo)은 배경음에만 건다 — 나레이션에 걸면 목소리가 웅웅 울려서 알아듣기 힘들어짐.
    `[bed]aecho=0.6:0.4:150|260:0.15|0.09[bedecho]`,
    `[bedecho]pan=stereo|c0=c0|c1=c0[bedstereo]`,
    `[bedstereo]haas[bedhaas]`,
    `[bedhaas][narrstereo]amix=inputs=2:duration=longest:normalize=0[premaster]`,
    `[premaster]afade=t=in:st=0:d=1.0,afade=t=out:st=${finalFadeOutStart.toFixed(2)}:d=2.0,alimiter=limit=0.8[aout]`,
  ].join(";");
}

async function buildOne(entry) {
  const code = String(entry.order).padStart(2, "0");
  const fileName = `${code}_${entry.id}_${entry.category}.mp4`;
  const sceneDir = new URL(`./${entry.id}/`, TMP_ROOT);
  await mkdir(sceneDir, { recursive: true });
  const sceneDirPath = fileURLToPath(sceneDir).replace(/[\\/]$/, "");

  await renderScenes(entry, sceneDirPath);

  // 1) 장면별 나레이션 생성 후 실제 길이 측정 → 그 길이로 장면 타임라인을 정한다.
  const texts = narrationTexts(entry);
  const order = ["hook", "info", "curiosity", "screenshot", "cta"];
  const narrationPaths = order.map((k) => `${sceneDirPath}/${k}.mp3`);
  for (let i = 0; i < order.length; i++) {
    synthesize(texts[order[i]], narrationPaths[i]);
  }
  const D = narrationPaths.map((p) => Math.max(MIN_SCENE, probeDuration(p) + SCENE_PAD));

  const { offsets, total } = cumulativeOffsets(D, FADE);
  const sceneStarts = [0, ...offsets];

  const videoFilter = buildVideoFilter(D, offsets);
  const narrationFilter = buildNarrationFilter(sceneStarts);
  const audioFilter = buildAudioFilter(D, offsets, total);
  const filterComplex = `${videoFilter};${narrationFilter};${audioFilter}`;

  const bedDur = Math.ceil(total) + 1;
  const args = [
    "-y",
    "-loop", "1", "-framerate", "30", "-t", String(D[0]), "-i", `${sceneDirPath}/1-hook.png`,
    "-loop", "1", "-framerate", "30", "-t", String(D[1]), "-i", `${sceneDirPath}/2-info.png`,
    "-loop", "1", "-framerate", "30", "-t", String(D[2]), "-i", `${sceneDirPath}/3-curiosity.png`,
    "-loop", "1", "-framerate", "30", "-t", String(D[3]), "-i", `${sceneDirPath}/4-screenshot.png`,
    "-loop", "1", "-framerate", "30", "-t", String(D[4]), "-i", `${sceneDirPath}/5-cta.png`,
    "-f", "lavfi", "-t", String(bedDur), "-i", "sine=frequency=110",
    "-f", "lavfi", "-t", String(bedDur), "-i", "sine=frequency=130.81",
    "-f", "lavfi", "-t", String(bedDur), "-i", "sine=frequency=164.81",
    "-f", "lavfi", "-t", String(bedDur), "-i", "sine=frequency=87.31",
    "-f", "lavfi", "-t", String(bedDur), "-i", "sine=frequency=110",
    "-f", "lavfi", "-t", String(bedDur), "-i", "sine=frequency=130.81",
    "-f", "lavfi", "-t", String(bedDur), "-i", "anoisesrc=color=pink",
    "-f", "lavfi", "-t", "0.8", "-i", "sine=frequency=783.99",
    "-f", "lavfi", "-t", "0.8", "-i", "sine=frequency=987.77",
    "-f", "lavfi", "-t", "0.8", "-i", "sine=frequency=1318.51",
    "-f", "lavfi", "-t", "0.8", "-i", "sine=frequency=1318.51",
    "-f", "lavfi", "-t", "0.8", "-i", "sine=frequency=1567.98",
    "-f", "lavfi", "-t", "0.35", "-i", "anoisesrc=color=pink",
    "-f", "lavfi", "-t", "0.35", "-i", "anoisesrc=color=pink",
    "-i", narrationPaths[0],
    "-i", narrationPaths[1],
    "-i", narrationPaths[2],
    "-i", narrationPaths[3],
    "-i", narrationPaths[4],
    "-filter_complex", filterComplex,
    "-map", "[vout]", "-map", "[aout]",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "44100",
    "-shortest", "-movflags", "+faststart",
    fileURLToPath(new URL(fileName, OUT_DIR)),
  ];

  execFileSync("ffmpeg", args, { stdio: ["ignore", "ignore", "ignore"] });
  console.log(`done: ${fileName} (총 ${total.toFixed(1)}초)`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(TMP_ROOT, { recursive: true });
  const targetId = process.argv[2];
  const targets = targetId
    ? REELS_IN_UPLOAD_ORDER.filter((e) => e.id === targetId)
    : REELS_IN_UPLOAD_ORDER;
  if (targetId && targets.length === 0) {
    throw new Error(`id "${targetId}"에 해당하는 릴스를 찾지 못했습니다.`);
  }
  for (const entry of targets) {
    await buildOne(entry);
  }
  await rm(TMP_ROOT, { recursive: true, force: true });
  console.log(`\n총 ${targets.length}개 릴스 생성 완료 → /reels`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
