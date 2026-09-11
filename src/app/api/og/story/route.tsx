import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { WUXING_HANJA, WUXING_HEX } from "@/lib/saju/wuxingHex";
import type { WuXing } from "@/lib/saju/ganzhi";

// 인스타그램 스토리 규격(9:16). /api/og/share(카카오 공유 카드, 1200x630)와 별개로,
// "스토리에 공유하기" 버튼 전용 세로형 이미지를 만든다 — 가로형 카드는 스토리에 올리면
// 위아래가 크게 잘려서 그대로 쓸 수 없다.
export const size = { width: 1080, height: 1920 };
export const contentType = "image/png";

const DEFAULT_ACCENT = "#d4af6a";

// 개인정보(생년월일시 등)는 절대 쿼리파라미터로 받지 않는다 — 결과 화면에서 이미 공개로
// 보여주는 요약값(일간 별명, 오행, 궁합 점수)만 사용한다(og/share route.tsx와 동일 제약).
function clamp(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const variant = searchParams.get("variant") === "compat" ? "compat" : "saju";
  const wxParam = searchParams.get("wx");
  const wx = wxParam && wxParam in WUXING_HEX ? (wxParam as WuXing) : null;

  const accent = wx ? WUXING_HEX[wx] : DEFAULT_ACCENT;
  const score = clamp(searchParams.get("score") ?? "", 6);
  const headline =
    variant === "compat"
      ? "우리 궁합"
      : clamp(searchParams.get("label") ?? "생년월일시로 읽는 나의 사주팔자", 20);
  const sub = clamp(searchParams.get("sub") ?? "", 40);

  // 배지 안에 넣는 큰 글자: 사주는 오행 한자, 궁합은 점수 숫자 — 둘 다 폰트에 이미 포함된
  // 문자라 이모지(twemoji)처럼 매 요청마다 외부 CDN을 거치지 않고 항상 렌더링된다.
  const badgeText = variant === "compat" ? score : wx ? WUXING_HANJA[wx] : "命";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "110px 80px",
          background: `radial-gradient(circle at 50% 28%, ${accent}33 0%, rgba(14,11,31,0) 55%), linear-gradient(160deg, #0e0b1f 0%, #171331 55%, #0e0b1f 100%)`,
          color: "#f3efe8",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, letterSpacing: 14, color: "#e8cf9c" }}>
          SAJU LAB
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 340,
              height: 340,
              borderRadius: 170,
              border: `10px solid ${accent}`,
              background: "rgba(255,255,255,0.04)",
              fontSize: variant === "compat" ? 140 : 170,
              fontWeight: 700,
              color: accent,
            }}
          >
            {badgeText}
            {variant === "compat" ? (
              <span style={{ fontSize: 40, marginLeft: 6, alignSelf: "flex-end", marginBottom: 24 }}>점</span>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 700,
              color: "#d4af6a",
              textAlign: "center",
              padding: "0 40px",
            }}
          >
            {headline}
          </div>

          {sub ? (
            <div
              style={{
                display: "flex",
                fontSize: 40,
                color: "#b9b3d6",
                textAlign: "center",
                padding: "0 60px",
              }}
            >
              {sub}
            </div>
          ) : null}

          {variant === "saju" && wx ? (
            <div style={{ display: "flex", gap: 16 }}>
              {(Object.keys(WUXING_HEX) as WuXing[]).map((key) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    background: WUXING_HEX[key],
                    opacity: key === wx ? 1 : 0.35,
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, width: "100%" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              padding: "28px 0",
              borderRadius: 24,
              background: "#d4af6a",
              color: "#1a1430",
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            무료로 내 사주 확인하기
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#b9b3d6" }}>사주랩</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
