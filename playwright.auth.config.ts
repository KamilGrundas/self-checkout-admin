import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  testMatch: "auth-modes.spec.ts",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "off",
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:5173",
    env: { VITE_API_URL: "http://127.0.0.1:8000" },
    reuseExistingServer: false,
  },
})
