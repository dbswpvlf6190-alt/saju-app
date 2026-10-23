import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { calculateSaju } from "@saju/engine";
import "../styles.css";
import { NewYearTeaser } from "./NewYearTeaser";

// 개발 전용 미리보기(v11-preview.html). ?y=1994-05-27 처럼 생일을 바꿔 볼 수 있다.
const q = new URLSearchParams(location.search).get("y") ?? "1995-07-12";
const [y, m, d] = q.split("-").map(Number);
const result = calculateSaju({ calendarType: "solar", gender: "female", year: y, month: m, day: d });

function Preview() {
  const [purchased, setPurchased] = useState(false);
  return (
    <main className="page">
      <NewYearTeaser result={result} priceLabel="3,900원" purchased={purchased} onOpen={() => setPurchased(true)} />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
);
