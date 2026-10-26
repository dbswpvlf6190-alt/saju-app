import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { calculateSaju } from "@saju/engine";
import "../styles.css";
import { NewYearTeaser, type TeaserVariant } from "./NewYearTeaser";

// 개발 전용 미리보기(v11-preview.html). ?y=1994-05-27&v=B 처럼 생일·버튼 문구를 바꿔 볼 수 있다.
const params = new URLSearchParams(location.search);
const [y, m, d] = (params.get("y") ?? "1965-03-14").split("-").map(Number);
const variant = (params.get("v") === "B" ? "B" : "A") as TeaserVariant;
const result = calculateSaju({ calendarType: "solar", gender: "female", year: y, month: m, day: d });


function Preview() {
  const [purchased, setPurchased] = useState(false);
  return (
    <main className="page">
      <NewYearTeaser
        result={result}
        priceLabel="3,894원"
        pricePerDay="하루 약 11원꼴"
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
