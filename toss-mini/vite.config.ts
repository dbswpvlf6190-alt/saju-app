import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

// 사주 계산·문구는 사주랩 사이트(../src/lib/saju)와 같은 코드를 그대로 쓴다 — 결과가 사이트와 달라지지 않게.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@saju": path.resolve(__dirname, "../src/lib/saju") },
    // 공유 코드가 import하는 lunar-typescript를 이 프로젝트의 node_modules에서 찾게 한다.
    dedupe: ["lunar-typescript"],
  },
  server: { fs: { allow: [".."] } },
});
