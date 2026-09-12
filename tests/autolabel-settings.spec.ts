import { expect, type Page, test } from "@playwright/test"

async function mockApi(page: Page) {
  await page.addInitScript(() =>
    sessionStorage.setItem("access_token", "test-session"),
  )
  const writes: Array<{ path: string; body: Record<string, unknown> }> = []
  let settings = {
    endpoint_url: "https://ai.example.test/v1/chat/completions",
    model_name: "saved-model",
    max_tokens: 512,
    connect_timeout_seconds: 5,
    read_timeout_seconds: 120,
    configured: true,
    api_key_configured: true,
  }
  let keyConfigured = true
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname
    const method = route.request().method()
    if (path.endsWith("/users/me"))
      return route.fulfill({
        json: {
          id: "00000000-0000-0000-0000-000000000001",
          email: "admin@example.com",
          is_active: true,
          is_superuser: true,
        },
      })
    if (method === "PUT" || method === "POST")
      writes.push({ path, body: route.request().postDataJSON() })
    if (path.endsWith("/autolabel/models"))
      return route.fulfill({
        json: {
          models: [
            { id: "saved-model", loaded: false },
            { id: "active-model", loaded: true, is_vision: true },
          ],
          active_model: "active-model",
        },
      })
    if (path.endsWith("/system-settings/autolabel")) {
      if (method === "PUT")
        settings = { ...settings, ...route.request().postDataJSON() }
      return route.fulfill({ json: settings })
    }
    if (path.endsWith("/integrations/vision-inference")) {
      if (method === "PUT") {
        const body = route.request().postDataJSON()
        keyConfigured = body.clear_api_key
          ? false
          : keyConfigured || !!body.api_key
      }
      return route.fulfill({
        json: {
          name: "Vision inference provider",
          endpoint_url: settings.endpoint_url,
          configured: keyConfigured,
        },
      })
    }
    if (path.endsWith("/api-keys/"))
      return route.fulfill({
        json:
          method === "POST"
            ? { key: "sck_test-only-created", role: "admin", expires_at: null }
            : [],
      })
    if (path.endsWith("/health-check/")) return route.fulfill({ json: true })
    if (path.endsWith("/batches/latest")) return route.fulfill({ json: null })
    if (path.endsWith("/label-counts"))
      return route.fulfill({ json: { total: 0, labels: [] } })
    if (path.endsWith("/scale/images"))
      return route.fulfill({ json: { data: [], next_cursor: null } })
    if (path.includes("/products"))
      return route.fulfill({ json: { data: [], count: 0 } })
    return route.fulfill({ json: [] })
  })
  return writes
}

test("model list defaults to loaded model and preserves an explicit choice on refresh", async ({
  page,
}) => {
  const writes = await mockApi(page)
  await page.goto("/ml")
  await page.getByRole("tab", { name: "Label", exact: true }).click()
  await expect(page.locator("#autolabel-endpoint")).toHaveAttribute(
    "placeholder",
    "http://localhost:11434/v1/chat/completions",
  )
  const model = page.locator("#autolabel-model")
  await expect(model).toHaveValue("active-model")
  await expect(page.locator("#autolabel-api-key")).toHaveCount(0)
  await model.selectOption("saved-model")
  await page
    .getByRole("button", { name: /Refresh models|Odśwież modele/ })
    .click()
  await expect(model).toHaveValue("saved-model")
  await page
    .getByRole("button", { name: /Save configuration|Zapisz konfigurację/ })
    .click()
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0].body.model_name).toBe("saved-model")
  expect(writes[0].body).not.toHaveProperty("api_key")
  await page
    .getByRole("link", {
      name: /Manage the vision inference token|Zarządzaj tokenem/,
    })
    .click()
  await expect(page).toHaveURL(/\/api-keys$/)
})

test("API Keys manages the integration credential without exposing it", async ({
  page,
}) => {
  const writes = await mockApi(page)
  await page.goto("/api-keys")
  const token = page.locator("#vision-inference-api-key")
  await expect(token).toHaveAttribute("type", "password")
  await expect(token).toHaveValue("")
  await token.fill("test-only-token")
  const save = page.getByRole("button", {
    name: /Save configuration|Zapisz konfigurację/,
  })
  await save.click()
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0].path).toContain("/api-keys/integrations/vision-inference")
  expect(writes[0].body.api_key).toBe("test-only-token")
  await expect(token).toHaveValue("")
  await save.click()
  await expect.poll(() => writes.length).toBe(2)
  expect(writes[1].body.api_key).toBeNull()
  await page.locator("#vision-inference-clear-key").check()
  await save.click()
  await expect.poll(() => writes.length).toBe(3)
  expect(writes[2].body.clear_api_key).toBe(true)
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "test-only-token",
  )
  expect(
    await page.evaluate(() => JSON.stringify(sessionStorage)),
  ).not.toContain("test-only-token")
})

test("new keys select user or admin with optional validity", async ({
  page,
}) => {
  const writes = await mockApi(page)
  await page.goto("/api-keys")
  await page.locator("#api-key-name").fill("automation")
  await expect(
    page.locator('input[name="api-key-role"][value="user"]'),
  ).toBeChecked()
  await page.locator('input[name="api-key-role"][value="admin"]').check()
  await expect(page.locator("#api-key-days")).toHaveValue("")
  await page.locator("form button").click()
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0].body).toMatchObject({ role: "admin", expires_in_days: null })
})
