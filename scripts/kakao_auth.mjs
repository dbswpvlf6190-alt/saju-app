// 카카오톡 "나에게 보내기" 인증용 1회성 스크립트.
// 사용법:
//   node scripts/kakao_auth.mjs url              — 로그인 URL 출력
//   node scripts/kakao_auth.mjs exchange <code>  — code로 토큰 발급, credentials/kakao_token.json에 저장
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SECRET_PATH = fileURLToPath(new URL("../credentials/kakao_secret.json", import.meta.url));
const TOKEN_PATH = fileURLToPath(new URL("../credentials/kakao_token.json", import.meta.url));

async function loadSecret() {
  return JSON.parse(await readFile(SECRET_PATH, "utf-8"));
}

async function getAuthUrl() {
  const secret = await loadSecret();
  const params = new URLSearchParams({
    client_id: secret.rest_api_key,
    redirect_uri: secret.redirect_uri,
    response_type: "code",
    scope: "talk_message",
  });
  console.log(`https://kauth.kakao.com/oauth/authorize?${params.toString()}`);
}

async function exchangeCode(code) {
  const secret = await loadSecret();
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: secret.rest_api_key,
    redirect_uri: secret.redirect_uri,
    code,
  });
  if (secret.client_secret) params.set("client_secret", secret.client_secret);
  const resp = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = await resp.json();
  if (!resp.ok) {
    console.error("토큰 발급 실패:", data);
    process.exit(1);
  }
  const tokenData = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    obtained_at: Date.now() / 1000,
    expires_in: data.expires_in,
  };
  await writeFile(TOKEN_PATH, JSON.stringify(tokenData, null, 2));
  console.log("토큰 저장 완료:", TOKEN_PATH);
}

const [, , cmd, arg] = process.argv;
if (cmd === "url") await getAuthUrl();
else if (cmd === "exchange" && arg) await exchangeCode(arg);
else console.log("사용법: node scripts/kakao_auth.mjs url | exchange <code>");
