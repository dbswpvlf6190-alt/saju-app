import { ImageResponse } from "next/og";
import { EXAM_SEASONS, formatExamDate, sanitizeCheerName, type ExamKind } from "@/lib/exam/seasons";

const SIZE = { width: 1200, height: 630 };

/** 수능·임용 페이지의 링크 미리보기 이미지. 응원 링크(?cheer=민지)면 보낸 사람 이름을 크게 넣는다.
 * 카톡은 미리보기를 오래 캐시하므로 매일 바뀌는 D-day 숫자 대신 시험 날짜를 쓴다. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind: ExamKind = params.get("kind") === "imyong" ? "imyong" : "suneung";
  const season = EXAM_SEASONS[kind];
  const cheer = sanitizeCheerName(params.get("cheer") ?? undefined);
  const isCheer = cheer !== null;
  const examName = kind === "imyong" ? "임용" : "수능";

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
          padding: "0 80px",
        }}
      >
        <div style={{ display: "flex", fontSize: 24, letterSpacing: 8, color: "#e8cf9c", marginBottom: 28 }}>
          {`SAJU LAB · ${examName} 합격운`}
        </div>
        {isCheer ? (
          <div
            style={{
              display: "flex",
              // 이름은 최대 20자라 길면 글자를 줄여 한 줄에 들어가게 한다.
              fontSize: cheer && cheer.length > 8 ? 32 : 40,
              color: "#bae6fd",
              border: "3px solid rgba(125, 211, 252, 0.6)",
              background: "rgba(125, 211, 252, 0.12)",
              borderRadius: 999,
              padding: "14px 40px",
              marginBottom: 26,
            }}
          >
            {`${cheer ? `${cheer}님이` : "친구가"} 보낸 ${season.noun} 응원이 도착했어요`}
          </div>
        ) : null}
        {/* 자동 줄바꿈에 맡기면 "흐름 / 은?"처럼 끊겨서 줄을 직접 나눈다. */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontWeight: 700, color: "#d4af6a" }}>
          {(isCheer ? ["내 합격운 흐름은", "어떤 타입일까?"] : [`${examName}까지,`, "나에게 맞는 마무리 흐름은?"]).map((line) => (
            <div key={line} style={{ display: "flex", fontSize: 68, lineHeight: 1.25 }}>
              {line}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 36 }}>
          {season.events.map((e) => (
            <div
              key={e.label}
              style={{
                display: "flex",
                fontSize: 30,
                color: "#f3efe8",
                border: "2px solid rgba(212, 175, 106, 0.6)",
                borderRadius: 999,
                padding: "10px 28px",
              }}
            >
              {`${e.label} ${formatExamDate(e.date)}${e.confirmed ? "" : " 예정"}`}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#b9b3d6", marginTop: 32 }}>
          생년월일시로 30초 · 무료로 확인
        </div>
      </div>
    ),
    SIZE,
  );
}
