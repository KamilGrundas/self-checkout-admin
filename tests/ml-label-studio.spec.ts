import { expect, test } from "@playwright/test"

test("Label Studio key is saved to the user and reused for sync", async ({
  page,
}) => {
  const apiKey = "browser-session-label-studio-key"
  let apiKeyConfigured = false

  await page.addInitScript(() => {
    localStorage.setItem("self-checkout-admin-language", "en")
  })

  await page.route(/\/api\/v1\/utils\/health-check$/, async (route) => {
    await route.fulfill({ json: { status: "ok" } })
  })

  await page.route(/\/api\/v1\/users\/me\/label-studio$/, async (route) => {
    if (route.request().method() === "PUT") {
      expect(route.request().postDataJSON()).toEqual({ api_key: apiKey })
      apiKeyConfigured = true
    }
    await route.fulfill({
      json: { api_key_configured: apiKeyConfigured },
    })
  })

  await page.route(/\/api\/v1\/label-studio\/projects$/, async (route) => {
    expect(route.request().headers()["x-label-studio-api-key"]).toBeUndefined()
    await route.fulfill({
      json: [{ id: 1, title: "scale-products" }],
    })
  })

  await page.route(/\/api\/v1\/label-studio\/sync$/, async (route) => {
    expect(route.request().headers()["x-label-studio-api-key"]).toBeUndefined()
    await route.fulfill({ json: { status: "configured" } })
  })

  await page.goto("/ml")
  await page.getByRole("tab", { name: "Label Studio" }).click()
  await page.getByRole("button", { name: "Add Label Studio API key" }).click()
  await page
    .getByRole("dialog", { name: "Add Label Studio API key" })
    .getByRole("textbox", { name: "Label Studio API Key" })
    .fill(apiKey)
  await page.getByRole("button", { name: "Save" }).click()

  await expect(page.getByText("Label Studio API key saved")).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Update Label Studio API key" }),
  ).toBeVisible()

  await page.getByRole("button", { name: "Sync Images" }).click()

  await expect(page.getByText("Images synced")).toBeVisible()
})
