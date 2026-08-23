import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
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
          SAJU READING
        </div>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700, color: "#d4af6a" }}>
          생년월일시로 읽는 나의 사주팔자
        </div>
        <div style={{ fontSize: 28, color: "#b9b3d6", marginTop: 28 }}>
          정확한 절기·음양력 계산으로 무료로 확인하세요
        </div>
      </div>
    ),
    { ...size },
  );
}
