import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { calculateSaju } from "@saju/engine";
import "../styles.css";
import { NewYearMini, NewYearTeaser } from "./NewYearTeaser";
import { NewYearScreen } from "./NewYearScreen";
import type { TeaserVariant } from "./ny";

// 개발 전용 미리보기(v11-preview.html). 쿼리로 바꿔 볼 수 있다:
//   ?m=card|mini|screen  화면(기본 card)   ?y=1965-03-14  생일   ?g=female|male   ?v=A|B  버튼 문구
//   ?t=1  (screen) 서버 글이 도착한 상태로 보기 — 없으면 "쓰는 중 → 불러오지 못함" 흐름을 본다
const params = new URLSearchParams(location.search);
const [y, m, d] = (params.get("y") ?? "1965-03-14").split("-").map(Number);
const variant = (params.get("v") === "B" ? "B" : "A") as TeaserVariant;
const mode = params.get("m") ?? "card";
const gender = params.get("g") === "male" ? "male" : "female";
const result = calculateSaju({ calendarType: "solar", gender, year: y, month: m, day: d });

const SAMPLE_TEXT = [
  "■ 2027 총평",
  "",
  "재물이 붙는 해로 봐요. 애쓴 만큼 결실이 따라오는 흐름이 보여요.",
  "",
  "올해 정해 둔 일을 하나씩 마무리하면 마음이 한결 편안해질 가능성이 있어요.",
  "",
  "■ 분기별 키워드",
  "",
  "1~3월 — 차분히 준비하기, 정리와 점검에 쓰면 좋은 기운",
  "4~6월 — 사람 만나기, 도움이 들어오는 시기",
  "7~9월 — 결실 챙기기, 미뤄 둔 일을 마무리하기 좋은 기운",
  "10~12월 — 나누고 감사하기, 한 해를 정리하는 시기",
  "",
  "■ 월별 흐름",
  "",
  ...Array.from({ length: 12 }, (_, i) =>
    i === 0 ? "1월 — 아직 지난해 기운이 이어지는 달이에요. 서두르지 말고 준비하세요." : `${i + 1}월 — 이 달의 흐름을 한 줄로 풀어 드려요. 마음가짐을 가볍게 가져 보세요.`,
  ),
  "",
  "■ 차분히 챙기면 좋은 달",
  "",
  "7월은 서두르지 않고 가까운 사람의 이야기를 먼저 들어 보면 좋은 달이에요.",
  "",
  "■ 기회로 삼으면 좋은 달",
  "",
  "흐름이 좋은 달에 미뤄 둔 일을 시작해 보세요. 작은 시작도 좋은 결과로 이어질 가능성이 있어요.",
  "",
  "■ 영역별 한 줄",
  "",
  "일 — 맡은 일을 꼼꼼히 마무리하면 인정받는 흐름이에요.",
  "돈 — 받을 돈과 통장을 정리하면 마음이 편해져요.",
  "사람 — 먼저 안부를 전하면 좋은 인연이 이어져요.",
  "",
  "■ 실천 조언 3가지",
  "",
  "이번 달 안에 통장과 서류를 한 번 정리해 보세요.",
  "가까운 사람에게 먼저 안부 전화를 해 보세요.",
  "하루 10분 걷기로 마음을 가볍게 유지해 보세요.",
].join("\n");

function Preview() {
  const [purchased, setPurchased] = useState(false);
  if (mode === "mini") return <main className="page"><NewYearMini result={result} purchased={purchased} onGo={() => setPurchased(true)} /></main>;
  if (mode === "screen")
    return <NewYearScreen purchase={{ paymentId: "toss-preview", token: "x" }} result={result} onBack={() => {}} previewText={params.get("t") === "1" ? SAMPLE_TEXT : undefined} />;
  return (
    <main className="page">
      <NewYearTeaser result={result} variant={variant} purchased={purchased} busy={false} onOpen={() => setPurchased(true)} />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
);
