import { expect, test } from "@playwright/test"

const counter = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Counter one",
  created_at: "2026-09-11T12:00:00Z",
  ml_mode: "off",
  shelf_camera_device_id: null,
  scale_camera_device_id: null,
  language: "pl",
  available_cameras: [],
  available_cameras_updated_at: null,
}

test("creates a counter with a one-time API key and no password", async ({
  page,
}) => {
  let requestBody: Record<string, unknown> | undefined
  await page.addInitScript(() => {
    localStorage.setItem("self-checkout-admin-language", "en")
  })
  await page.route(/\/api\/v1\/checkout-counters\/$/, async (route) => {
    if (route.request().method() === "POST") {
      requestBody = route.request().postDataJSON()
      return route.fulfill({ json: { ...counter, api_key: "sck_created-key" } })
    }
    return route.fulfill({ json: { data: [], count: 0 } })
  })

  await page.goto("/checkout-counters")
  await page.getByRole("button", { name: "Add Counter" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByLabel("Password")).toHaveCount(0)
  await dialog.getByLabel("Name *").fill("Counter one")
  await dialog.getByRole("button", { name: "Save" }).click()

  await expect.poll(() => requestBody).toEqual({ name: "Counter one" })
  await expect(dialog.getByText(/Download the key now/i)).toBeVisible()
})

test("rotates a counter key from the counter actions", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("self-checkout-admin-language", "en")
  })
  await page.route(/\/api\/v1\/checkout-counters\/$/, (route) =>
    route.fulfill({ json: { data: [counter], count: 1 } }),
  )
  await page.route(
    new RegExp(`/api/v1/checkout-counters/${counter.id}/api-key/rotate$`),
    (route) => route.fulfill({ json: { api_key: "sck_rotated-key" } }),
  )

  await page.goto("/checkout-counters")
  const row = page.getByRole("row").filter({ hasText: counter.name })
  await row.getByRole("button").last().click()
  await page.getByRole("menuitem", { name: "Rotate counter key" }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("button", { name: "Rotate counter key" }).click()
  await expect(dialog.getByText(/Download the key now/i)).toBeVisible()
})
