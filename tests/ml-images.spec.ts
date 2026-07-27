import { expect, test } from "@playwright/test"

const images = [
  {
    object_name: "sessions/session-1/captures/0000-empty.jpg",
    image_url:
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
    size: 10,
    etag: "empty",
    session_id: "session-1",
    capture_index: 0,
    is_empty: true,
    existing_product_id: null,
    existing_product_name: null,
    autolabel: null,
    status: "unlabeled",
  },
  {
    object_name: "sessions/session-1/captures/0001-product.jpg",
    image_url:
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
    size: 20,
    etag: "manual",
    session_id: "session-1",
    capture_index: 1,
    is_empty: false,
    existing_product_id: "product-manual",
    existing_product_name: "Manual apple",
    autolabel: null,
    status: "unlabeled",
  },
  {
    object_name: "raw/scale/banana.jpg",
    image_url:
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
    size: 30,
    etag: "banana",
    session_id: null,
    capture_index: null,
    is_empty: false,
    existing_product_id: null,
    existing_product_name: null,
    autolabel: null,
    status: "unlabeled",
  },
  {
    object_name: "raw/scale/grapes.jpg",
    image_url:
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
    size: 40,
    etag: "grapes",
    session_id: null,
    capture_index: null,
    is_empty: false,
    existing_product_id: null,
    existing_product_name: null,
    autolabel: null,
    status: "unlabeled",
  },
]

test("scale images configure, test, queue, poll and restore a batch", async ({
  page,
}) => {
  let settingsPut = false
  let endpointTested = false
  let batchPosts = 0
  let batchPolls = 0
  let latestAvailable = false

  await page.addInitScript(() => {
    localStorage.setItem("self-checkout-admin-language", "en")
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      value: undefined,
      configurable: true,
    })
  })
  await page.route(/\/api\/v1\/utils\/health-check$/, (route) =>
    route.fulfill({ json: { status: "ok" } }),
  )
  await page.route(/\/api\/v1\/system-settings\/autolabel$/, async (route) => {
    if (route.request().method() === "PUT") {
      settingsPut = true
      const body = route.request().postDataJSON()
      await route.fulfill({ json: { ...body, configured: true } })
      return
    }
    await route.fulfill({
      json: {
        endpoint_url: "http://192.168.0.29:8088/v1/files/inference",
        max_tokens: 512,
        connect_timeout_seconds: 5,
        read_timeout_seconds: 120,
        configured: true,
      },
    })
  })
  await page.route(/\/api\/v1\/autolabel\/scale\/images/, (route) =>
    route.fulfill({ json: { data: images, next_cursor: "next-page" } }),
  )
  await page.route(/\/api\/v1\/autolabel\/scale\/batches\/latest$/, (route) =>
    latestAvailable
      ? route.fulfill({
          json: {
            batch_id: "batch-1",
            status: "completed",
            total: 2,
            completed: 2,
            matched: 1,
            unmatched: 0,
            failed: 1,
            items: [
              {
                object_name: "raw/scale/banana.jpg",
                status: "matched",
                product_id: "banana-id",
                product_name: "Banana",
              },
              {
                object_name: "raw/scale/grapes.jpg",
                status: "failed",
                error: "Controlled failure",
              },
            ],
          },
        })
      : route.fulfill({ status: 404, json: { detail: "No recent batch" } }),
  )
  await page.route(/\/api\/v1\/autolabel\/scale\/test$/, async (route) => {
    endpointTested = true
    await route.fulfill({
      json: {
        state: "matched",
        candidate_key: "P0001",
        product_id: "banana-id",
        product_name: "Banana",
        response_sha256: "a".repeat(64),
      },
    })
  })
  await page.route(/\/api\/v1\/autolabel\/scale\/batches$/, async (route) => {
    batchPosts += 1
    expect(route.request().headers()["idempotency-key"]).toBeTruthy()
    expect(route.request().postDataJSON().object_names).toEqual([
      "raw/scale/banana.jpg",
      "raw/scale/grapes.jpg",
    ])
    latestAvailable = true
    await route.fulfill({
      status: 202,
      json: {
        batch_id: "batch-1",
        status: "queued",
        total: 2,
        completed: 0,
        matched: 0,
        unmatched: 0,
        failed: 0,
        items: [
          { object_name: "raw/scale/banana.jpg", status: "queued" },
          { object_name: "raw/scale/grapes.jpg", status: "queued" },
        ],
      },
    })
  })
  await page.route(
    /\/api\/v1\/autolabel\/scale\/batches\/batch-1$/,
    async (route) => {
      batchPolls += 1
      await route.fulfill({
        json:
          batchPolls < 2
            ? {
                batch_id: "batch-1",
                status: "processing",
                total: 2,
                completed: 1,
                matched: 1,
                unmatched: 0,
                failed: 0,
                items: [
                  {
                    object_name: "raw/scale/banana.jpg",
                    status: "matched",
                    product_id: "banana-id",
                    product_name: "Banana",
                  },
                  {
                    object_name: "raw/scale/grapes.jpg",
                    status: "processing",
                  },
                ],
              }
            : {
                batch_id: "batch-1",
                status: "completed",
                total: 2,
                completed: 2,
                matched: 1,
                unmatched: 0,
                failed: 1,
                items: [
                  {
                    object_name: "raw/scale/banana.jpg",
                    status: "matched",
                    product_id: "banana-id",
                    product_name: "Banana",
                  },
                  {
                    object_name: "raw/scale/grapes.jpg",
                    status: "failed",
                    error: "Controlled failure",
                  },
                ],
              },
      })
    },
  )

  await page.goto("/ml")
  await page.getByRole("tab", { name: "Images" }).click()
  await expect(
    page.getByRole("img", { name: "raw/scale/banana.jpg" }),
  ).toBeVisible()

  await page.getByRole("button", { name: "Select only unlabeled" }).click()
  await expect(
    page.getByRole("checkbox", {
      name: "Select image sessions/session-1/captures/0000-empty.jpg",
    }),
  ).not.toBeChecked()
  await expect(
    page.getByRole("checkbox", {
      name: "Select image sessions/session-1/captures/0001-product.jpg",
    }),
  ).not.toBeChecked()
  await expect(
    page.getByRole("checkbox", {
      name: "Select image raw/scale/banana.jpg",
    }),
  ).toBeChecked()
  await expect(
    page.getByRole("checkbox", {
      name: "Select image raw/scale/grapes.jpg",
    }),
  ).toBeChecked()

  await page.getByLabel("Max tokens").fill("768")
  await page.getByRole("button", { name: "Save configuration" }).click()
  await expect.poll(() => settingsPut).toBe(true)
  await page.getByRole("button", { name: "Test endpoint" }).click()
  await expect.poll(() => endpointTested).toBe(true)

  await page.getByRole("button", { name: /Start autolabeling/ }).click()
  await expect.poll(() => batchPosts).toBe(1)
  await expect(page.getByText("Banana", { exact: true })).toBeVisible()
  await expect(page.getByText("Controlled failure")).toBeVisible({
    timeout: 5000,
  })
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "2",
  )

  await page.reload()
  await page.getByRole("tab", { name: "Images" }).click()
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "2",
  )
})

test("images tab has Polish labels", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("self-checkout-admin-language", "pl")
  })
  await page.route(/\/api\/v1\/utils\/health-check$/, (route) =>
    route.fulfill({ json: { status: "ok" } }),
  )
  await page.route(/\/api\/v1\/system-settings\/autolabel$/, (route) =>
    route.fulfill({
      json: {
        endpoint_url: null,
        max_tokens: 512,
        connect_timeout_seconds: 5,
        read_timeout_seconds: 120,
        configured: false,
      },
    }),
  )
  await page.route(/\/api\/v1\/autolabel\/scale\/images/, (route) =>
    route.fulfill({ json: { data: [], next_cursor: null } }),
  )
  await page.route(/\/api\/v1\/autolabel\/scale\/batches\/latest$/, (route) =>
    route.fulfill({ status: 404, json: { detail: "none" } }),
  )

  await page.goto("/ml")
  await page.getByRole("tab", { name: "Obrazy" }).click()

  await expect(
    page.getByText("Konfiguracja automatycznego etykietowania"),
  ).toBeVisible()
  await expect(page.getByText("Nie znaleziono obrazów z wagi")).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Zaznacz tylko bez etykiety" }),
  ).toBeVisible()
})
