import { expect, type Page, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

async function mockApi(page: Page) {
  await page.addInitScript(() =>
    sessionStorage.setItem("access_token", "test-session"),
  )
  const writes: Array<{ path: string; body: Record<string, unknown> }> = []
  let integrations = [
    {
      id: "provider-1",
      name: "Vision one",
      endpoint_url: "https://vision.example.test/v1/chat/completions",
      api_key_configured: true,
      active: true,
      configured: true,
      model_name: "active-model",
      active_model: "active-model",
      model_loaded: true,
      read_timeout_seconds: 600,
    },
  ]
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
    if (method === "PATCH" || method === "PUT" || method === "POST")
      writes.push({ path, body: route.request().postDataJSON() })
    if (path.endsWith("/vision-inference-integrations/provider-1/models"))
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
      return route.fulfill({ json: { configured: integrations[0].configured } })
    }
    if (path.endsWith("/vision-inference-integrations/")) {
      if (method === "POST") {
        const body = route.request().postDataJSON()
        integrations = [
          ...integrations,
          {
            id: "provider-2",
            name: body.name,
            endpoint_url: body.endpoint_url,
            api_key_configured: true,
            active: false,
            configured: false,
            model_name: null,
            active_model: null,
            model_loaded: false,
            read_timeout_seconds: 120,
          },
        ]
      }
      return route.fulfill({
        json: method === "POST" ? integrations.at(-1) : integrations,
      })
    }
    if (path.endsWith("/vision-inference-integrations/provider-1")) {
      if (method === "PATCH")
        integrations[0] = {
          ...integrations[0],
          ...route.request().postDataJSON(),
        }
      return route.fulfill({ json: integrations[0] })
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

test("integrations add providers, select models, and show model status", async ({
  page,
}) => {
  const writes = await mockApi(page)
  await page.goto("/integrations")
  await expect(page.locator("#integration-endpoint")).toHaveAttribute(
    "placeholder",
    "https://vision_inference.com/v1/chat/completions",
  )
  await expect(page.getByText("Loaded model detected")).toBeVisible()
  const model = page.locator("#integration-model-provider-1")
  await expect(model).toHaveValue("active-model")
  await model.selectOption("saved-model")
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0].body.model_name).toBe("saved-model")
  await page.locator("#integration-name").fill("Vision two")
  await page
    .locator("#integration-endpoint")
    .fill("https://other.example.test/v1/chat/completions")
  await page.locator("#integration-api-key").fill("test-only-token")
  await page
    .getByRole("button", { name: /Add integration|Dodaj integrację/ })
    .click()
  await expect.poll(() => writes.length).toBe(2)
  expect(writes[1].body).toMatchObject({
    name: "Vision two",
    api_key: "test-only-token",
  })
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "test-only-token",
  )
  expect(
    await page.evaluate(() => JSON.stringify(sessionStorage)),
  ).not.toContain("test-only-token")
})

test("integration editor uses the saved timeout and allows up to 6000 seconds", async ({
  page,
}) => {
  const writes = await mockApi(page)
  await page.goto("/integrations")
  await page.getByLabel("Actions").click()
  await page.getByRole("menuitem", { name: "Edit integration" }).click()
  const timeout = page.locator("#read-timeout-provider-1")
  await expect(timeout).toHaveValue("600")
  await expect(timeout).toHaveAttribute("max", "6000")
  await timeout.fill("6000")
  await page.getByRole("button", { name: "Save configuration" }).click()
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0].body.read_timeout_seconds).toBe(6000)
})

test("autolabel is unavailable until an integration is configured and active", async ({
  page,
}) => {
  await mockApi(page)
  await page.route("**/api/v1/system-settings/autolabel", (route) =>
    route.fulfill({ json: { configured: false } }),
  )
  await page.goto("/label")
  await expect(
    page.getByText(/Configure a vision inference provider/),
  ).toBeVisible()
  await expect(
    page.getByRole("button", { name: /Start autolabeling/ }),
  ).toBeDisabled()
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
