import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { calculateSaju } from "@saju/engine";
import "../styles.css";
import { NewYearTeaser, type TeaserVariant } from "./NewYearTeaser";

// 개발 전용 미리보기(v11-preview.html). ?y=1994-05-27&v=B 처럼 생일·버튼 문구를 바꿔 볼 수 있다.
// 1월 맛보기 문장은 **예시**다 — 실제로는 신년운세 리포트의 1월 풀이를 넣는다(10/26 연결).
const params = new URLSearchParams(location.search);
const [y, m, d] = (params.get("y") ?? "1965-03-14").split("-").map(Number);
const variant = (params.get("v") === "B" ? "B" : "A") as TeaserVariant;
const result = calculateSaju({ calendarType: "solar", gender: "female", year: y, month: m, day: d });

const SAMPLE_JANUARY = {
  label: "1월",
  text: "새해 첫 달은 서두르기보다 한 해 계획을 차분히 세우기 좋은 때로 봐요. 가까운 사람과 나눈 이야기에서 좋은 실마리가 나올 수 있어요.",
};

function Preview() {
  const [purchased, setPurchased] = useState(false);
  return (
    <main className="page">
      <NewYearTeaser
        result={result}
        priceLabel="3,894원"
        pricePerDay="하루 약 11원꼴"
        freeMonth={SAMPLE_JANUARY}
        variant={variant}
        purchased={purchased}
        onOpen={() => setPurchased(true)}
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
);
