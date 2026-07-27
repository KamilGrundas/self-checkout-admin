import { expect, test } from "@playwright/test"

const counter = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Camera test counter",
  created_at: "2026-07-27T12:00:00Z",
  ml_mode: "off",
  shelf_camera_device_id: "missing-camera",
  scale_camera_device_id: null,
  language: "pl",
  available_cameras: [
    {
      device_id: "camera-front",
      label: "Front camera",
      index: 0,
    },
    {
      device_id: "camera-scale",
      label: "Scale camera",
      index: 1,
    },
  ],
  available_cameras_updated_at: "2026-07-27T12:30:00Z",
}

test("selects cameras reported by the checkout client", async ({ page }) => {
  let updatePayload: Record<string, unknown> | undefined

  await page.addInitScript(() => {
    localStorage.setItem("self-checkout-admin-language", "en")
  })
  await page.route(/\/api\/v1\/checkout-counters\/$/, async (route) => {
    await route.fulfill({ json: { data: [counter], count: 1 } })
  })
  await page.route(
    new RegExp(`/api/v1/checkout-counters/${counter.id}$`),
    async (route) => {
      updatePayload = route.request().postDataJSON()
      await route.fulfill({ json: { ...counter, ...updatePayload } })
    },
  )

  await page.goto("/checkout-counters")
  const row = page.getByRole("row").filter({ hasText: counter.name })
  await row.getByRole("button").last().click()
  await page.getByRole("menuitem", { name: "Edit Counter" }).click()

  const dialog = page.getByRole("dialog")
  await expect(
    dialog.getByText("Updated camera settings will take effect"),
  ).toBeVisible()

  const shelfCamera = dialog.getByLabel("Shelf camera")
  await expect(shelfCamera).toContainText("currently unavailable")
  await shelfCamera.click()
  await page.getByRole("option", { name: /Front camera/ }).click()

  const scaleCamera = dialog.getByLabel("Scale camera")
  await scaleCamera.click()
  await page.getByRole("option", { name: /Scale camera/ }).click()

  await dialog.getByRole("button", { name: "Save" }).click()
  await expect
    .poll(() => updatePayload)
    .toMatchObject({
      shelf_camera_device_id: "camera-front",
      scale_camera_device_id: "camera-scale",
    })
})
