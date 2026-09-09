import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  testMatch: "autolabel-settings.spec.ts",
  use: { baseURL: "http://127.0.0.1:5184", trace: "off" },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5184",
    url: "http://127.0.0.1:5184",
    env: {
      VITE_API_URL: "http://127.0.0.1:8000",
      VITE_ML_API_URL: "http://127.0.0.1:8001",
    },
    reuseExistingServer: false,
  },
})
