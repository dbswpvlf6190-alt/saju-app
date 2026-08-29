import { prisma } from "@/lib/db/prisma";

// 카카오톡 "나에게 보내기"로 결제 알림을 보낸다. access_token은 6시간마다 만료되므로,
// 만료 임박 시 refresh_token으로 자동 갱신하고 DB의 단일 행(KakaoToken)에 갱신 결과를
// 다시 저장한다 — 서버리스 환경이라 로컬 파일에 상태를 남길 수 없기 때문이다.
const REST_API_KEY = process.env.KAKAO_REST_API_KEY;
const CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET;

async function refreshAccessToken(refreshToken: string) {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: REST_API_KEY!,
    refresh_token: refreshToken,
  });
  if (CLIENT_SECRET) params.set("client_secret", CLIENT_SECRET);

  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!res.ok) {
    throw new Error(`카카오 토큰 갱신 실패: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function getValidAccessToken(): Promise<string> {
  const record = await prisma.kakaoToken.findUnique({ where: { id: "default" } });
  if (!record) {
    throw new Error("카카오 토큰이 아직 설정되지 않았습니다 (KakaoToken 테이블에 최초 값이 없음).");
  }

  const ageSeconds = (Date.now() - record.obtainedAt.getTime()) / 1000;
  // 만료 5분 전부터는 미리 갱신해, 만료 직전 요청이 실패하는 일이 없게 한다.
  if (ageSeconds < record.expiresIn - 300) {
    return record.accessToken;
  }

  const data = await refreshAccessToken(record.refreshToken);
  await prisma.kakaoToken.update({
    where: { id: "default" },
    data: {
      accessToken: data.access_token,
      // 카카오는 재발급 시 refresh_token을 항상 새로 주지는 않는다 — 없으면 기존 값을 유지한다.
      refreshToken: data.refresh_token ?? record.refreshToken,
      obtainedAt: new Date(),
      expiresIn: data.expires_in,
    },
  });
  return data.access_token;
}

export async function sendPaymentKakaoNotification(order: {
  amount: number;
  productType: string;
  paymentId: string;
}): Promise<void> {
  if (!REST_API_KEY) {
    throw new Error("KAKAO_REST_API_KEY 환경변수가 설정되지 않았습니다.");
  }

  const accessToken = await getValidAccessToken();
  const templateObject = {
    object_type: "text",
    text: `💰 사주랩 결제 완료\n${order.amount.toLocaleString()}원 · ${order.productType}\n${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
    link: {
      web_url: "https://saju-app-three-dusky.vercel.app/admin",
      mobile_web_url: "https://saju-app-three-dusky.vercel.app/admin",
    },
  };

  const res = await fetch("https://kapi.kakao.com/v2/api/talk/memo/default/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ template_object: JSON.stringify(templateObject) }),
  });
  if (!res.ok) {
    throw new Error(`카카오 메시지 전송 실패: ${res.status} ${await res.text()}`);
  }
}
