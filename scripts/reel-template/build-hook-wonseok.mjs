// "패턴 인터럽트" 훅 릴스 — 렌더링된 8장 PNG를 ffmpeg로 조립한다.
// 구조: 결과 플래시(1s) → 되감기/빈 폼(2s) → 초고속 입력 2컷(2s) → 임팩트 플래시 → 재리빌(4s)
//       → 소름 텍스트(4s) → CTA(4s) → 엔드카드(3s), 총 약 20초. 나레이션 없음(자막만).
// 실행: node scripts/reel-template/build-hook-wonseok.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { renderAll } from "./render-hook-wonseok.mjs";

const PROJECT_ROOT = new URL("../../", import.meta.url);
const OUT_PATH = fileURLToPath(new URL("./reels/hook_wonseok_type.mp4", PROJECT_ROOT));
const TMP_DIR = fileURLToPath(new URL("./scripts/reel-template/.tmp/hook_wonseok/", PROJECT_ROOT));

const FPS = 30;

async function makeFlashPng(path) {
  // 1x1 흰색 PNG를 만들어 ffmpeg에서 스케일 업 — 임팩트 플래시용.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  await writeFile(path, png);
}

function zoompan(idx, frames, zStart, zEnd, label) {
  const z = zEnd > zStart ? `min(zoom+${((zEnd - zStart) / frames).toFixed(5)},${zEnd})` : `${zStart}`;
  return `[${idx}:v]scale=1080:1920,zoompan=z='${z}':d=${frames}:s=1080x1920:fps=${FPS}[${label}]`;
}

async function main() {
  await mkdir(TMP_DIR, { recursive: true });
  await renderAll(TMP_DIR);
  const flashPath = `${TMP_DIR}/flash.png`;
  await makeFlashPng(flashPath);

  // 장면별 길이(초)
  const D = { s1: 1.0, s2: 2.0, s3a: 1.0, s3b: 1.0, flash: 0.1, s4: 3.9, s5: 4.0, s6: 4.0, s7: 3.0 };
  const F = Object.fromEntries(Object.entries(D).map(([k, v]) => [k, Math.max(1, Math.round(v * FPS))]));

  // 주의(2026-09-21 재확인): zoompan은 "입력 프레임 1장"에서 d개의 출력 프레임을 만든다.
  // 그래서 zoompan에 넣는 그림 입력은 -loop/-t 없이 "그냥 1프레임"으로 넣어야 한다.
  // -loop 1(무한 반복)이나 -t(반복 프레임 수)를 걸면 입력 프레임마다 d개씩 또 만들어져서
  // 길이가 폭발한다(20초짜리가 31분 → 수백 MB 깨진 파일로 나옴). 길이는 zoompan의 d= 하나로만 정한다.
  const still = (name) => ["-i", `${TMP_DIR}/${name}`];
  const inputs = [
    ...still("1.png"),
    ...still("2.png"),
    ...still("3a.png"),
    ...still("3b.png"),
    // 플래시는 zoompan을 안 거치므로 -loop + -t로 길이(0.1초)를 정한다.
    ...["-loop", "1", "-framerate", String(FPS), "-t", String(D.flash), "-i", flashPath],
    ...still("4.png"),
    ...still("5.png"),
    ...still("6.png"),
    ...still("7.png"),
  ];

  const filters = [
    // 0: 첫 플래시 — 살짝 줌인만(강한 임팩트, 짧게)
    zoompan(0, F.s1, 1.0, 1.06, "v0"),
    // 1: 빈 폼 — 정적(되감기 느낌은 컷으로 처리)
    zoompan(1, F.s2, 1.0, 1.0, "v1"),
    // 2,3: 초고속 입력 두 컷 — 살짝 줌만
    zoompan(2, F.s3a, 1.0, 1.03, "v2"),
    zoompan(3, F.s3b, 1.0, 1.03, "v3"),
    // 4: 임팩트 화이트 플래시(짧게)
    `[4:v]scale=1080:1920,setsar=1,fps=${FPS}[v4]`,
    // 5: 재리빌 — 빠른 펀치인 줌 + 살짝 흔들림(rotate 워블, 앞부분만)
    `[5:v]scale=1080:1920,zoompan=z='min(zoom+0.03,1.18)':d=${F.s4}:s=1080x1920:fps=${FPS}[v5zoom]`,
    `[v5zoom]rotate='if(lt(t,0.6),0.025*sin(2*PI*9*t)*(1-t/0.6),0)':c=none:ow=1080:oh=1920[v5]`,
    // 6: 소름 텍스트 — 천천히 줌인(크롭 확대되는 느낌)
    zoompan(6, F.s5, 1.0, 1.1, "v6"),
    // 7: CTA — 은은한 줌
    zoompan(7, F.s6, 1.0, 1.04, "v7"),
    // 8: 엔드카드 — 정적
    zoompan(8, F.s7, 1.0, 1.0, "v8"),
    // 전부 컷 편집(하드컷)으로 이어붙임 — 훅 스타일 편집은 크로스페이드보다 컷이 더 빠르고 강하게 읽힘
    `[v0][v1][v2][v3][v4][v5][v6][v7][v8]concat=n=9:v=1:a=0[vout]`,
  ].join(";");

  const totalDur = Object.values(D).reduce((a, b) => a + b, 0);

  const args = [
    "-y",
    ...inputs,
    // 임팩트 사운드(합성, 저작권 문제 없음): 재리빌 순간(약 5.1초 지점)에 강한 히트음
    "-f", "lavfi", "-t", "0.5", "-i", "sine=frequency=90",
    "-f", "lavfi", "-t", "0.4", "-i", "anoisesrc=color=pink",
    "-f", "lavfi", "-t", String(totalDur + 0.5), "-i", "anullsrc=r=44100:cl=stereo",
    "-filter_complex",
    `${filters};` +
      `[9:a]volume=0.9,afade=t=out:st=0.05:d=0.45,adelay=${Math.round((D.s1 + D.s2 + D.s3a + D.s3b) * 1000)}|${Math.round((D.s1 + D.s2 + D.s3a + D.s3b) * 1000)}[hit1];` +
      `[10:a]highpass=f=200,volume=0.5,afade=t=out:st=0.02:d=0.3,adelay=${Math.round((D.s1 + D.s2 + D.s3a + D.s3b) * 1000)}|${Math.round((D.s1 + D.s2 + D.s3a + D.s3b) * 1000)}[hit2];` +
      `[11:a][hit1][hit2]amix=inputs=3:duration=first:normalize=0[aout]`,
    "-map", "[vout]", "-map", "[aout]",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "44100",
    "-shortest", "-movflags", "+faststart",
    OUT_PATH,
  ];

  execFileSync("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
  console.log(`done: ${OUT_PATH} (약 ${totalDur.toFixed(1)}초)`);
}

main().catch((err) => {
  console.error(err.stderr ? err.stderr.toString() : err);
  process.exit(1);
});
