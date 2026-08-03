import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // 이 앱은 전부 localStorage 기반이라, 앱 껍데기(HTML/JS/CSS)만 미리 캐싱해두면
      // 와이파이/데이터 없이도 완전히 오프라인으로 켜고 쓸 수 있다.
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
      },
      manifest: {
        name: "국내 철도 완주 기록",
        short_name: "철도완주",
        description: "수도권 전철·광역철도 및 전국 철도 노선 완주 기록 앱",
        lang: "ko",
        start_url: ".",
        scope: ".",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#111827",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});
