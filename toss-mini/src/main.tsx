import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App";

// 개발 화면 전용(스크린샷 캡처): ?hide=N 이면 결과 화면 위쪽 N개 블록을 숨겨 아래 블록부터 보여준다.
if (import.meta.env.DEV) {
  const n = Number(new URLSearchParams(location.search).get("hide") || 0);
  if (n) {
    const st = document.createElement("style");
    st.textContent = `main.page > *:nth-child(-n+${n}) { display: none !important; }`;
    document.head.appendChild(st);
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
