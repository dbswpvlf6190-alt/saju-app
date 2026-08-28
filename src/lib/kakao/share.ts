// 카카오 JS SDK(window.Kakao)는 next/script로 layout에서 비동기 로드된다.
// 광고차단기 등으로 스크립트 로드가 막히면 window.Kakao 자체가 없을 수 있어
// 호출부에서 항상 실패 가능성을 체크하고 폴백(Web Share API/클립보드)으로 넘어가야 한다.
interface KakaoShareContent {
  title: string;
  description: string;
  imageUrl: string;
  link: { mobileWebUrl: string; webUrl: string };
}

interface KakaoSdk {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share: {
    sendDefault: (settings: {
      objectType: "feed";
      content: KakaoShareContent;
      buttons?: Array<{ title: string; link: { mobileWebUrl: string; webUrl: string } }>;
    }) => void;
  };
}

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

function getKakaoSdk(): KakaoSdk | null {
  if (typeof window === "undefined" || !window.Kakao) return null;
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!key) return null;
  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(key);
  }
  return window.Kakao;
}

/** 카카오톡 공유 시도. SDK가 없거나 초기화에 실패하면 false를 반환해 호출부가 폴백하게 한다. */
export function shareToKakao({
  title,
  description,
  url,
  imageUrl,
  buttonLabel = "무료로 확인하기",
}: {
  title: string;
  description: string;
  url: string;
  /** 결과별 맞춤 카드 이미지 URL. 안 넘기면 사이트 기본 OG 이미지를 쓴다. */
  imageUrl?: string;
  buttonLabel?: string;
}): boolean {
  const kakao = getKakaoSdk();
  if (!kakao) return false;

  kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title,
      description,
      imageUrl: imageUrl ?? `${new URL(url).origin}/opengraph-image`,
      link: { mobileWebUrl: url, webUrl: url },
    },
    buttons: [{ title: buttonLabel, link: { mobileWebUrl: url, webUrl: url } }],
  });
  return true;
}
