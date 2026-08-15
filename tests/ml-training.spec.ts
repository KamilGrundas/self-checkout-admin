import { expect, test } from "@playwright/test"

test("training displays stage, epoch and progress until completion", async ({
  page,
}) => {
  let statusPolls = 0

  await page.addInitScript(() => {
    localStorage.setItem("self-checkout-admin-language", "en")
  })

  await page.route(/\/api\/v1\/utils\/health-check\/$/, async (route) => {
    await route.fulfill({ json: { status: "ok" } })
  })

  await page.route(/\/api\/v1\/datasets\/training$/, async (route) => {
    await route.fulfill({
      json: [
        {
          project_slug: "long-training",
          project_title: "Long training dataset",
          release_name: "release-1",
          export_type: "YOLO",
          sample_count: 10,
          release_prefix: "long-training/release-1",
          bucket: "training-data",
        },
      ],
    })
  })

  await page.route(/\/api\/v1\/train\/classifier$/, async (route) => {
    await route.fulfill({
      json: {
        job_id: "training-job-1",
        status: "queued",
        stage: "queued",
        message: "Training queued",
        progress: 0,
        total_epochs: 12,
      },
      status: 202,
    })
  })

  await page.route(
    /\/api\/v1\/train\/classifier\/training-job-1$/,
    async (route) => {
      statusPolls += 1
      await route.fulfill({
        json:
          statusPolls < 3
            ? {
                job_id: "training-job-1",
                status: "running",
                stage: "training",
                message: "Completed epoch 2 of 12",
                progress: 35,
                current_epoch: 2,
                total_epochs: 12,
                metrics: { accuracy: 0.75 },
              }
            : {
                job_id: "training-job-1",
                status: "completed",
                stage: "completed",
                message: "Training completed",
                progress: 100,
                current_epoch: 12,
                total_epochs: 12,
                result: { run_id: "completed-run" },
              },
      })
    },
  )

  await page.goto("/ml")
  await page.getByRole("tab", { name: "Train" }).click()
  await page.getByRole("checkbox").check()
  await page.getByRole("button", { name: "Train Classifier" }).click()

  await expect(page.getByText("Epoch 2 / 12")).toBeVisible()
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "35",
  )
  await expect(page.getByText("Accuracy: 75.0%")).toBeVisible()

  await expect(
    page.getByRole("progressbar").locator("..").getByText("Training completed"),
  ).toBeVisible({ timeout: 5000 })
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "100",
  )
})
