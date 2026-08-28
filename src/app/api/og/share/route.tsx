import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 공유 카드 이미지 URL은 카카오톡 채팅방에 그대로 노출되고 캐시될 수 있어서,
// 여기 들어가는 값은 사주 결과 화면에서 이미 공개로 보여주는 정도(일간 별명, 궁합 점수 등)로만
// 제한한다. 이름·생년월일시 같은 개인정보는 절대 쿼리파라미터로 넘기지 않는다.
function clamp(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const variant = searchParams.get("variant") === "compat" ? "compat" : "saju";

  const eyebrow = variant === "compat" ? "SAJU LAB · 궁합" : "SAJU LAB";
  const headline =
    variant === "compat"
      ? `우리 궁합 ${clamp(searchParams.get("score") ?? "", 6)}점`
      : clamp(searchParams.get("label") ?? "생년월일시로 읽는 나의 사주팔자", 30);
  const sub = clamp(searchParams.get("sub") ?? "", 46);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0e0b1f 0%, #171331 60%, #0e0b1f 100%)",
          color: "#f3efe8",
        }}
      >
        <div style={{ fontSize: 22, letterSpacing: 8, color: "#e8cf9c", marginBottom: 24 }}>
          {eyebrow}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 68,
            fontWeight: 700,
            color: "#d4af6a",
            textAlign: "center",
            padding: "0 60px",
          }}
        >
          {headline}
        </div>
        {sub ? (
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#b9b3d6",
              marginTop: 28,
              textAlign: "center",
              padding: "0 90px",
            }}
          >
            {sub}
          </div>
        ) : null}
      </div>
    ),
    { ...size },
  );
}
