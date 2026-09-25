// 카카오 로그인(OAuth 인가 코드 방식). notify.ts가 쓰는 것과 같은 카카오 개발자 앱을
// 재사용한다 — 그 앱에 "카카오 로그인" 제품만 추가로 활성화하고 Redirect URI를
// 등록하면 된다(REST API 키는 동일, KAKAO_REST_API_KEY).
const REST_API_KEY = process.env.KAKAO_REST_API_KEY;
const CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;

export class KakaoLoginError extends Error {}

export function buildKakaoAuthorizeUrl(redirectUri: string, state?: string): string {
  if (!REST_API_KEY) {
    throw new KakaoLoginError("KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다.");
  }
  const params = new URLSearchParams({
    client_id: REST_API_KEY,
    redirect_uri: redirectUri,
    response_type: "code",
  });
  if (state) params.set("state", state);
  return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
}

async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  if (!REST_API_KEY) {
    throw new KakaoLoginError("KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다.");
  }
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: REST_API_KEY,
    redirect_uri: redirectUri,
    code,
  });
  if (CLIENT_SECRET) params.set("client_secret", CLIENT_SECRET);

  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!res.ok) {
    throw new KakaoLoginError(`카카오 토큰 교환 실패: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

interface KakaoProfile {
  kakaoId: string;
  nickname: string | null;
}

async function fetchKakaoProfile(accessToken: string): Promise<KakaoProfile> {
  const res = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new KakaoLoginError(`카카오 사용자 정보 조회 실패: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return {
    kakaoId: String(data.id),
    nickname: data.kakao_account?.profile?.nickname ?? null,
  };
}

/** 로그인 콜백에서 받은 code를 카카오 사용자 식별값으로 바꾼다. */
export async function resolveKakaoLogin(code: string, redirectUri: string): Promise<KakaoProfile> {
  const accessToken = await exchangeCodeForToken(code, redirectUri);
  return fetchKakaoProfile(accessToken);
}
