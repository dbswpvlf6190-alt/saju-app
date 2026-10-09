import { defineConfig } from "@apps-in-toss/web-framework/config";

// 앱인토스 콘솔에 등록한 정보와 같아야 한다(appName은 콘솔에서 정한 영문 이름).
export default defineConfig({
  appName: "sajulab",
  brand: {
    displayName: "사주랩",
    primaryColor: "#7B5CD6",
    icon: "", // 콘솔 앱 정보에 올린 아이콘 이미지 URL
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
});
