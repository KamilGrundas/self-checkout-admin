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
    captured_at: "2026-08-11T10:00:00Z",
    is_empty: true,
    is_imported: false,
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
    captured_at: "2026-08-11T10:01:00Z",
    is_empty: false,
    is_imported: false,
    existing_product_id: "product-manual",
    existing_product_name: "Manual apple",
    autolabel: {
      state: "matched",
      product_id: "product-manual",
      product_name: "Manual apple",
      timestamp: "2026-08-11T10:02:00Z",
      batch_id: "previous-batch",
    },
    status: "matched",
  },
  {
    object_name: "raw/scale/banana.jpg",
    image_url:
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
    size: 30,
    etag: "banana",
    session_id: null,
    capture_index: null,
    captured_at: "2026-08-11T10:03:00Z",
    is_empty: false,
    is_imported: true,
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
    captured_at: "2026-08-11T10:04:00Z",
    is_empty: false,
    is_imported: true,
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
  let importRequested = false
  let finalizeRequested = false
  let finalizeCompleted = false

  await page.addInitScript(() => {
    localStorage.setItem("self-checkout-admin-language", "en")
    Object.defineProperty(globalThis.crypto, "randomUUID", {
      value: undefined,
      configurable: true,
    })
  })
  await page.route(/\/api\/v1\/utils\/health-check\/$/, (route) =>
    route.fulfill({ json: { status: "ok" } }),
  )
  await page.route(/\/api\/v1\/products\//, (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "banana-id",
            name: "Banana",
            price: 1,
            unit: "kg",
            category_id: "category-id",
            category_name: "Fruit",
            category_key: "fruit",
          },
          {
            id: "product-manual",
            name: "Manual apple",
            price: 1,
            unit: "kg",
            category_id: "category-id",
            category_name: "Fruit",
            category_key: "fruit",
          },
        ],
        count: 2,
      },
    }),
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
        endpoint_url: "https://ai.teik.pl/v1/files/inference",
        max_tokens: 512,
        connect_timeout_seconds: 5,
        read_timeout_seconds: 120,
        configured: true,
      },
    })
  })
  await page.route(
    /\/api\/v1\/autolabel\/scale\/images\/selection-count$/,
    async (route) => {
      const selection = route.request().postDataJSON().selection
      await route.fulfill({
        json: { count: selection === "all_non_empty" ? 413 : 31 },
      })
    },
  )
  await page.route(
    /\/api\/v1\/autolabel\/scale\/images\/label-counts$/,
    (route) =>
      route.fulfill({
        json: {
          total: finalizeCompleted ? 2 : 4,
          labels: finalizeCompleted
            ? []
            : [
                {
                  product_id: "product-manual",
                  product_name: "Manual apple",
                  count: 1,
                },
              ],
        },
      }),
  )
  await page.route(/\/api\/v1\/autolabel\/scale\/images(?:\?.*)?$/, (route) => {
    const filter = new URL(route.request().url()).searchParams.get(
      "label_product_id",
    )
    const availableImages = finalizeCompleted
      ? images.filter(
          (image) =>
            image.object_name !==
              "sessions/session-1/captures/0001-product.jpg" &&
            image.object_name !== "raw/scale/banana.jpg",
        )
      : images
    route.fulfill({
      json: {
        data: filter
          ? availableImages.filter(
              (image) => image.autolabel?.product_id === filter,
            )
          : availableImages,
        next_cursor: null,
      },
    })
  })
  await page.route(/\/api\/v1\/datasets\/scale-images$/, async (route) => {
    importRequested = true
    expect(route.request().postDataBuffer()).toBeTruthy()
    await route.fulfill({ json: [] })
  })
  await page.route(
    /\/api\/v1\/autolabel\/scale\/images\/finalize$/,
    async (route) => {
      finalizeRequested = true
      expect(route.request().postDataJSON()).toEqual({
        object_names: [],
        selection: "all_matched",
      })
      await route.fulfill({ json: { queued: true, job_id: "finalize-job" } })
    },
  )
  await page.route(
    /\/api\/v1\/autolabel\/scale\/images\/finalize\/finalize-job$/,
    async (route) => {
      finalizeCompleted = true
      await route.fulfill({
        json: {
          job_id: "finalize-job",
          status: "completed",
          moved: 2,
          error: null,
        },
      })
    },
  )
  await page.route(/\/api\/v1\/autolabel\/scale\/batches\/latest$/, (route) =>
    latestAvailable
      ? route.fulfill({
          json: {
            batch_id: "batch-1",
            status: "completed",
            total: 3,
            completed: 3,
            matched: 2,
            unmatched: 0,
            failed: 1,
            items: [
              {
                object_name: "sessions/session-1/captures/0001-product.jpg",
                status: "matched",
                product_id: "banana-id",
                product_name: "Banana",
              },
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
    expect(route.request().postDataJSON()).toEqual({
      object_names: [],
      selection: "all_non_empty",
      retry_only: false,
    })
    latestAvailable = true
    await route.fulfill({
      status: 202,
      json: {
        batch_id: "batch-1",
        status: "queued",
        total: 3,
        completed: 0,
        matched: 0,
        unmatched: 0,
        failed: 0,
        items: [
          {
            object_name: "sessions/session-1/captures/0001-product.jpg",
            status: "queued",
          },
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
                total: 3,
                completed: 1,
                matched: 1,
                unmatched: 0,
                failed: 0,
                items: [
                  {
                    object_name: "sessions/session-1/captures/0001-product.jpg",
                    status: "matched",
                    product_id: "banana-id",
                    product_name: "Banana",
                  },
                  {
                    object_name: "raw/scale/banana.jpg",
                    status: "processing",
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
                total: 3,
                completed: 3,
                matched: 2,
                unmatched: 0,
                failed: 1,
                items: [
                  {
                    object_name: "sessions/session-1/captures/0001-product.jpg",
                    status: "matched",
                    product_id: "banana-id",
                    product_name: "Banana",
                  },
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
  await page.getByRole("tab", { name: "Label" }).click()
  await expect(
    page.getByRole("img", { name: "raw/scale/banana.jpg" }),
  ).toBeVisible()
  await expect(page.getByText("Imported").first()).toBeVisible()
  await expect(page.getByRole("button", { name: "All (4)" })).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Manual apple (1)" }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Manual apple (1)" }).click()
  await expect(
    page.getByRole("img", { name: "raw/scale/banana.jpg" }),
  ).not.toBeVisible()
  await page.getByRole("button", { name: "All (4)" }).click()

  await page.locator("#label-images").setInputFiles([
    {
      name: "unknown-1.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("unknown-1"),
    },
    {
      name: "unknown-2.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("unknown-2"),
    },
  ])
  await page.getByRole("button", { name: "Import images (2)" }).click()
  await expect.poll(() => importRequested).toBe(true)

  await page
    .getByRole("button", { name: "Select all images for autolabeling" })
    .click()
  await expect(
    page.getByRole("button", { name: "Start autolabeling (413)" }),
  ).toBeVisible()
  await expect(
    page.getByRole("checkbox", {
      name: "Select image sessions/session-1/captures/0000-empty.jpg",
    }),
  ).not.toBeChecked()
  await expect(
    page.getByRole("checkbox", {
      name: "Select image sessions/session-1/captures/0001-product.jpg",
    }),
  ).toBeChecked()
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
  await expect(page.getByLabel("Label raw/scale/banana.jpg")).toHaveValue(
    "banana-id",
  )
  await expect(
    page.getByLabel("Label sessions/session-1/captures/0001-product.jpg"),
  ).toHaveValue("banana-id")
  await expect(page.getByLabel("Label raw/scale/grapes.jpg")).toHaveValue("")
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "3",
  )

  await page.getByRole("button", { name: "Select all Matched" }).click()
  await expect(
    page.getByRole("button", { name: "Move to Images (31)" }),
  ).toBeVisible()
  await expect(
    page.getByRole("checkbox", {
      name: "Select image sessions/session-1/captures/0001-product.jpg",
    }),
  ).toBeChecked()
  await expect(
    page.getByRole("checkbox", {
      name: "Select image raw/scale/grapes.jpg",
    }),
  ).not.toBeChecked()
  await page.getByRole("button", { name: "Move to Images (31)" }).click()
  await expect(page.getByText("Move 31 images to Images?")).toBeVisible()
  await page.getByRole("button", { name: "Yes" }).click()
  await expect.poll(() => finalizeRequested).toBe(true)
  await expect(
    page.getByRole("img", {
      name: "sessions/session-1/captures/0001-product.jpg",
    }),
  ).not.toBeVisible()

  await page.reload()
  await page.getByRole("tab", { name: "Label" }).click()
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "3",
  )
})

test("images tab imports a labeled batch and exports every labeled image", async ({
  page,
}) => {
  let importRequested = false
  let exportedNames: string[] = []
  let duplicateDeleted = false
  const labeledImage = (objectName: string) => ({
    object_name: objectName,
    image_url: "/datasets/images/content",
    size: 10,
    etag: objectName,
    captured_at: "2026-08-11T10:00:00Z",
    product_id: "apple-id",
    product_name: "Apple",
  })

  await page.addInitScript(() => {
    localStorage.setItem("self-checkout-admin-language", "en")
  })
  await page.route(/\/api\/v1\/utils\/health-check\/$/, (route) =>
    route.fulfill({ json: { status: "ok" } }),
  )
  await page.route(/\/api\/v1\/products\//, (route) =>
    route.fulfill({
      json: {
        data: [
          {
            id: "apple-id",
            name: "Apple",
            price: 1,
            unit: "kg",
            category_id: "category-id",
            category_name: "Fruit",
            category_key: "fruit",
          },
        ],
        count: 1,
      },
    }),
  )
  await page.route(/\/datasets\/images\/content/, (route) =>
    route.fulfill({
      body: Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
        "base64",
      ),
      contentType: "image/gif",
    }),
  )
  await page.route(/\/datasets\/images\/label-counts$/, (route) =>
    route.fulfill({
      json: {
        total: 2,
        labels: [{ product_id: "apple-id", product_name: "Apple", count: 2 }],
      },
    }),
  )
  await page.route(/\/datasets\/images(?:\?.*)?$/, async (route) => {
    if (route.request().method() === "GET") {
      const requestUrl = new URL(route.request().url())
      const secondPage = requestUrl.searchParams.get("cursor") === "page-2"
      await route.fulfill({
        json: {
          data: [
            labeledImage(
              secondPage ? "labeled/apple-2.jpg" : "labeled/apple-1.jpg",
            ),
          ],
          next_cursor: secondPage ? null : "page-2",
        },
      })
      return
    }
    await route.fallback()
  })
  await page.route(/\/datasets\/images\/import$/, async (route) => {
    importRequested = true
    expect(route.request().postDataBuffer()).toBeTruthy()
    await route.fulfill({ json: [labeledImage("labeled/imported.jpg")] })
  })
  await page.route(/\/datasets\/images\/export$/, async (route) => {
    exportedNames = route.request().postDataJSON().object_names
    await route.fulfill({
      json: {
        release_name: "labeled-images",
        object_count: exportedNames.length,
      },
    })
  })
  await page.route(/\/datasets\/images\/duplicates$/, async (route) => {
    await route.fulfill({
      json: {
        job_id: "duplicate-job",
        status: "queued",
        processed: 0,
        total: 2,
        progress: 0,
        duplicate_count: 0,
        similarity_threshold: 0.99,
        error: null,
      },
    })
  })
  await page.route(
    /\/datasets\/images\/duplicates\/duplicate-job$/,
    async (route) => {
      if (route.request().method() === "DELETE") {
        duplicateDeleted = true
        await route.fulfill({ json: { deleted: 1 } })
        return
      }
      await route.fulfill({
        json: {
          job_id: "duplicate-job",
          status: "completed",
          processed: 2,
          total: 2,
          progress: 100,
          duplicate_count: 1,
          similarity_threshold: 0.99,
          error: null,
        },
      })
    },
  )

  await page.goto("/ml")
  await page.getByRole("tab", { name: "Images" }).click()
  await expect(page.getByRole("button", { name: "All (2)" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Apple (2)" })).toBeVisible()
  await page.locator("#bulk-label").selectOption("apple-id")
  await page.locator("#bulk-images").setInputFiles([
    {
      name: "apple-1.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("apple-1"),
    },
    {
      name: "apple-2.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("apple-2"),
    },
  ])
  await page.getByRole("button", { name: "Import images (2)" }).click()
  await expect.poll(() => importRequested).toBe(true)

  await page.getByRole("button", { name: "Select all images" }).click()
  await expect(
    page.getByRole("button", { name: "Export Dataset (2)" }),
  ).toBeVisible()
  await page.getByRole("button", { name: "Export Dataset (2)" }).click()
  await expect
    .poll(() => exportedNames.sort())
    .toEqual(["labeled/apple-1.jpg", "labeled/apple-2.jpg"])

  await page.getByRole("button", { name: "Detect duplicates (99%)" }).click()
  await expect(
    page.getByText("Found 1 duplicates. Delete duplicates?"),
  ).toBeVisible()
  await page.getByRole("button", { name: "Yes" }).click()
  await expect.poll(() => duplicateDeleted).toBe(true)
})

test("images tab has Polish labels", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("self-checkout-admin-language", "pl")
  })
  await page.route(/\/api\/v1\/utils\/health-check\/$/, (route) =>
    route.fulfill({ json: { status: "ok" } }),
  )
  await page.route(/\/api\/v1\/products\//, (route) =>
    route.fulfill({ json: { data: [], count: 0 } }),
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
  await page.getByRole("tab", { name: "Label" }).click()

  await expect(
    page.getByText("Konfiguracja automatycznego etykietowania"),
  ).toBeVisible()
  await expect(page.getByText("Nie znaleziono obrazów z wagi")).toBeVisible()
  await expect(
    page.getByRole("button", {
      name: "Zaznacz wszystkie do autolabelowania",
    }),
  ).toBeVisible()
})
