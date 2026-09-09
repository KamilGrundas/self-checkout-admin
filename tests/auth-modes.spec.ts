import { expect, test } from "@playwright/test"

test("local mode shows only local sign-in", async ({ page }) => {
  await page.route("**/api/v1/login/config", (route) =>
    route.fulfill({
      json: { mode: "local", signup_enabled: false, oidc: null },
    }),
  )
  await page.goto("/login")
  await expect(page.getByTestId("email-input")).toBeVisible()
  await expect(page.getByTestId("password-input")).toBeVisible()
  await expect(page.getByRole("link", { name: "Sign up" })).toHaveCount(0)
  await expect(
    page.getByRole("button", { name: /Single sign-on/ }),
  ).toHaveCount(0)
})

test("OIDC mode hides passwords and uses authorization code with PKCE", async ({
  page,
}) => {
  await page.route("**/api/v1/login/config", (route) =>
    route.fulfill({
      json: {
        mode: "oidc",
        signup_enabled: false,
        oidc: {
          issuer: "https://identity.example/",
          client_id: "test-client",
          label: "Single sign-on",
        },
      },
    }),
  )
  await page.route(
    "https://identity.example/.well-known/openid-configuration",
    (route) =>
      route.fulfill({
        json: {
          issuer: "https://identity.example/",
          authorization_endpoint: "https://identity.example/authorize",
          token_endpoint: "https://identity.example/token",
          jwks_uri: "https://identity.example/keys",
          userinfo_endpoint: "https://identity.example/userinfo",
        },
      }),
  )
  await page.route("https://identity.example/authorize?**", (route) =>
    route.fulfill({ body: "Identity provider" }),
  )
  await page.goto("/login")
  await expect(page.getByTestId("password-input")).toHaveCount(0)
  await page.getByRole("button", { name: /Single sign-on/ }).click()
  await page.waitForURL("https://identity.example/authorize?**")
  const url = new URL(page.url())
  expect(url.searchParams.get("response_type")).toBe("code")
  expect(url.searchParams.get("code_challenge_method")).toBe("S256")
  expect(url.searchParams.get("code_challenge")).toBeTruthy()
  expect(url.searchParams.get("state")).toBeTruthy()
  expect(url.searchParams.has("client_secret")).toBe(false)
})

test("configuration failure does not fall back to local sign-in", async ({
  page,
}) => {
  await page.route("**/api/v1/login/config", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  )
  await page.goto("/login")
  await expect(page.getByTestId("password-input")).toHaveCount(0)
})

async function mockRole(page: import("@playwright/test").Page, admin: boolean) {
  await page.addInitScript(() =>
    sessionStorage.setItem("access_token", "test-session"),
  )
  await page.route("**/api/v1/users/me", (route) =>
    route.fulfill({
      json: {
        id: "00000000-0000-0000-0000-000000000001",
        email: "reader@example.com",
        full_name: "Catalog Reader",
        is_active: true,
        is_superuser: admin,
        auth_source: "oidc",
      },
    }),
  )
  await page.route("**/api/v1/products/**", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "00000000-0000-0000-0000-000000000002",
            name: "Apple",
            price: "2.00",
            unit: "pcs",
            category_name: "Fruit",
            category_key: "fruit",
            image_url: null,
          },
        ],
        count: 1,
      },
    }),
  )
  await page.route("**/api/v1/categories/**", (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "00000000-0000-0000-0000-000000000003",
            name: "Fruit",
            key: "fruit",
          },
        ],
        count: 1,
      },
    }),
  )
}

test("reader sees catalog without management controls", async ({ page }) => {
  await mockRole(page, false)
  await page.goto("/products")
  await expect(page.getByText("Apple", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: /Add Product/i })).toHaveCount(
    0,
  )
  await expect(
    page.locator(
      'a[href="/admin"],a[href="/ml"],a[href="/api-keys"],a[href="/checkout-counters"],a[href="/live-sessions"]',
    ),
  ).toHaveCount(0)
  await expect(
    page.locator('table [data-slot="dropdown-menu-trigger"]'),
  ).toHaveCount(0)
  await page.getByTestId("user-menu").click()
  await expect(page.getByRole("link", { name: /Settings/i })).toHaveCount(0)
  await page.goto("/categories")
  await expect(page.getByText("Fruit", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: /Add Category/i })).toHaveCount(
    0,
  )
})

for (const path of [
  "/",
  "/admin",
  "/ml",
  "/api-keys",
  "/checkout-counters",
  "/live-sessions",
  "/live-sessions/00000000-0000-0000-0000-000000000001",
  "/settings",
]) {
  test(`reader cannot navigate directly to ${path}`, async ({ page }) => {
    await mockRole(page, false)
    await page.goto(path)
    await expect(page).toHaveURL(/\/products$/)
    await expect(page.getByText("Apple", { exact: true })).toBeVisible()
  })
}

test("administrator keeps catalog management controls", async ({ page }) => {
  await mockRole(page, true)
  await page.goto("/products")
  await expect(page.getByRole("button", { name: /Add Product/i })).toBeVisible()
  await expect(page.locator('a[href="/admin"]')).toBeVisible()
  await page.goto("/categories")
  await expect(
    page.getByRole("button", { name: /Add Category/i }),
  ).toBeVisible()
})
