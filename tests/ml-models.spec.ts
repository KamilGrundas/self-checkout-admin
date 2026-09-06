import { expect, test } from "@playwright/test"

test("models hide registry versions and can be deleted", async ({ page }) => {
  let deletedModel = false

  await page.addInitScript(() => {
    localStorage.setItem("self-checkout-admin-language", "en")
  })
  await page.route(/\/api\/v1\/utils\/health-check\/$/, (route) =>
    route.fulfill({ json: { status: "ok" } }),
  )
  await page.route(/\/api\/v1\/inference\/classify-models$/, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        json: [
          {
            name: "classifier",
            version: 2,
            model_id: "12345678-1234-1234-1234-123456789abc",
            status: "ready",
            description: null,
            created_at: "2026-08-14T12:30:00Z",
            is_active: true,
            metrics: { accuracy: 0.91, val_accuracy: 0.87 },
          },
        ],
      })
      return
    }
    await route.fallback()
  })
  await page.route(
    /\/api\/v1\/inference\/classify-models\/2$/,
    async (route) => {
      deletedModel = true
      await route.fulfill({ json: { model_id: "12345678" } })
    },
  )
  await page.route(/\/api\/v1\/inference\/detect-models$/, (route) =>
    route.fulfill({ json: [] }),
  )

  await page.goto("/ml")

  await expect(page.getByRole("columnheader", { name: "Version" })).toHaveCount(
    0,
  )
  await expect(page.getByText("v2", { exact: true })).toHaveCount(0)
  await page.getByLabel("Delete model").click()
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click()
  await expect.poll(() => deletedModel).toBe(true)
})
