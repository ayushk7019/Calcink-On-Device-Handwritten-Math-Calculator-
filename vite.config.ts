import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",

      manifest: {
        name: "CalcInk",
        short_name: "CalcInk",
        description:
          "On-device handwritten math calculator",
        display: "standalone",
        background_color: "#fdfaf3",
        theme_color: "#fdfaf3",
      },

      workbox: {
        globPatterns: [
          "**/*.{js,css,html,json,bin,webmanifest}",
        ],

        maximumFileSizeToCacheInBytes:
          10 * 1024 * 1024,
      },
    }),
  ],
});