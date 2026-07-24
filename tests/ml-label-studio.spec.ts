import { expect, test } from "@playwright/test"

test("Label Studio key is sent from the admin UI for sync", async ({
  page,
}) => {
  const apiKey = "browser-session-label-studio-key"

  await page.addInitScript(() => {
    localStorage.setItem("self-checkout-admin-language", "en")
  })

  await page.route(/\/api\/v1\/utils\/health-check$/, async (route) => {
    await route.fulfill({ json: { status: "ok" } })
  })

  await page.route(/\/api\/v1\/label-studio\/projects$/, async (route) => {
    expect(route.request().headers()["x-label-studio-api-key"]).toBe(apiKey)
    await route.fulfill({
      json: [{ id: 1, title: "scale-products" }],
    })
  })

  await page.route(/\/api\/v1\/label-studio\/sync$/, async (route) => {
    expect(route.request().headers()["x-label-studio-api-key"]).toBe(apiKey)
    await route.fulfill({ json: { status: "configured" } })
  })

  await page.goto("/ml")
  await page.getByRole("tab", { name: "Label Studio" }).click()
  await page.getByLabel("Label Studio API Key").fill(apiKey)
  await page.getByRole("button", { name: "Connect" }).click()

  await expect(page.getByText("Connected to Label Studio")).toBeVisible()

  await page.getByRole("button", { name: "Sync Images" }).click()

  await expect(page.getByText("Images synced")).toBeVisible()
})
