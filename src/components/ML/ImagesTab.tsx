import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { SystemSettingsService } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingButton } from "@/components/ui/loading-button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useI18n } from "@/i18n"
import mlApi, { mlErrorMessage } from "@/mlClient"

type ItemStatus =
  | "unlabeled"
  | "queued"
  | "processing"
  | "matched"
  | "unmatched"
  | "failed"

interface AutolabelResult {
  state: "matched" | "unmatched" | "failed"
  product_id: string | null
  product_name: string | null
  timestamp: string
  batch_id: string
  error?: string | null
}

interface ScaleImage {
  object_name: string
  image_url: string
  size: number
  etag: string | null
  session_id: string | null
  capture_index: number | null
  is_empty: boolean
  existing_product_id: string | null
  existing_product_name: string | null
  autolabel: AutolabelResult | null
  status: ItemStatus
}

interface ScaleImagesPage {
  data: ScaleImage[]
  next_cursor: string | null
}

interface BatchItem {
  object_name: string
  status: ItemStatus
  product_id: string | null
  product_name: string | null
  error?: string | null
}

interface Batch {
  batch_id: string
  status: "queued" | "processing" | "completed" | "failed"
  total: number
  completed: number
  matched: number
  unmatched: number
  failed: number
  items: BatchItem[]
}

interface SettingsForm {
  endpoint_url: string | null
  max_tokens: number
  connect_timeout_seconds: number
  read_timeout_seconds: number
}

const defaultSettings: SettingsForm = {
  endpoint_url: null,
  max_tokens: 512,
  connect_timeout_seconds: 5,
  read_timeout_seconds: 120,
}

const createIdempotencyKey = () => {
  const bytes = new Uint8Array(16)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
    return `batch-${Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("")}`
  }
  return `batch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

const ScaleImageThumbnail = ({
  image,
}: {
  image: Pick<ScaleImage, "image_url" | "object_name" | "etag">
}) => {
  const isEmbedded = image.image_url.startsWith("data:")
  const thumbnailQuery = useQuery({
    queryKey: ["scale-image-thumbnail", image.object_name, image.etag],
    queryFn: () =>
      mlApi
        .get<Blob>(image.image_url, {
          params: { object_name: image.object_name },
          responseType: "blob",
        })
        .then((response) => response.data),
    enabled: !isEmbedded,
    staleTime: 60_000,
  })
  const [blobUrl, setBlobUrl] = useState<string>()

  useEffect(() => {
    if (!thumbnailQuery.data) return
    const url = URL.createObjectURL(thumbnailQuery.data)
    setBlobUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [thumbnailQuery.data])

  return (
    <img
      src={isEmbedded ? image.image_url : blobUrl}
      alt={image.object_name}
      className="size-20 rounded object-cover"
    />
  )
}

export function ImagesTab() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [cursor, setCursor] = useState<string | null>(null)
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [settingsForm, setSettingsForm] =
    useState<SettingsForm>(defaultSettings)
  const [batchId, setBatchId] = useState<string | null>(null)

  const settingsQuery = useQuery({
    queryKey: ["autolabel-settings"],
    queryFn: () => SystemSettingsService.systemSettingsReadAutolabelSettings(),
  })

  useEffect(() => {
    if (!settingsQuery.data) return
    setSettingsForm({
      endpoint_url: settingsQuery.data.endpoint_url ?? null,
      max_tokens: settingsQuery.data.max_tokens ?? 512,
      connect_timeout_seconds: settingsQuery.data.connect_timeout_seconds ?? 5,
      read_timeout_seconds: settingsQuery.data.read_timeout_seconds ?? 120,
    })
  }, [settingsQuery.data])

  const imagesQuery = useQuery({
    queryKey: ["scale-images", cursor],
    queryFn: () =>
      mlApi
        .get<ScaleImagesPage>("/autolabel/scale/images", {
          params: { cursor, page_size: 24 },
        })
        .then((response) => response.data),
  })

  const latestBatchQuery = useQuery({
    queryKey: ["scale-autolabel-latest"],
    queryFn: () =>
      mlApi
        .get<Batch>("/autolabel/scale/batches/latest")
        .then((response) => response.data),
    retry: false,
  })

  useEffect(() => {
    if (latestBatchQuery.data) setBatchId(latestBatchQuery.data.batch_id)
  }, [latestBatchQuery.data])

  const batchQuery = useQuery({
    queryKey: ["scale-autolabel-batch", batchId],
    queryFn: () =>
      mlApi
        .get<Batch>(`/autolabel/scale/batches/${batchId}`)
        .then((response) => response.data),
    enabled: Boolean(batchId),
    retry: false,
    refetchInterval: (query) => {
      const batch = query.state.data as Batch | undefined
      return batch?.status === "completed" || batch?.status === "failed"
        ? false
        : 1000
    },
  })

  const activeBatch = batchQuery.data ?? latestBatchQuery.data
  const activeItems = useMemo(
    () =>
      new Map(
        (activeBatch?.items ?? []).map((item) => [item.object_name, item]),
      ),
    [activeBatch],
  )

  useEffect(() => {
    if (
      activeBatch?.status === "completed" ||
      activeBatch?.status === "failed"
    ) {
      void queryClient.invalidateQueries({ queryKey: ["scale-images"] })
    }
  }, [activeBatch?.status, queryClient])

  const saveSettingsMutation = useMutation({
    mutationFn: (body: SettingsForm) =>
      SystemSettingsService.systemSettingsUpdateAutolabelSettings({
        autolabelSettingsUpdate: body,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["autolabel-settings"], data)
      toast.success(t("autolabelSettingsSaved"))
    },
    onError: (error) =>
      toast.error(t("autolabelSettingsSaveFailed"), {
        description: mlErrorMessage(error),
      }),
  })

  const testMutation = useMutation({
    mutationFn: (objectName: string) =>
      mlApi
        .post(
          "/autolabel/scale/test",
          { object_name: objectName },
          { timeout: 0 },
        )
        .then((response) => response.data),
    onSuccess: (result) =>
      toast.success(
        result.product_name
          ? `${t("endpointTestMatched")}: ${result.product_name}`
          : t("endpointTestUnmatched"),
      ),
    onError: (error) =>
      toast.error(t("endpointTestFailed"), {
        description: mlErrorMessage(error),
      }),
  })

  const batchMutation = useMutation({
    mutationFn: ({
      objectNames,
      retryOnly,
      confirmExistingLabels,
    }: {
      objectNames: string[]
      retryOnly: boolean
      confirmExistingLabels: boolean
    }) =>
      mlApi
        .post<Batch>(
          "/autolabel/scale/batches",
          {
            object_names: objectNames,
            retry_only: retryOnly,
            confirm_existing_labels: confirmExistingLabels,
          },
          {
            headers: { "Idempotency-Key": createIdempotencyKey() },
          },
        )
        .then((response) => response.data),
    onSuccess: (batch) => {
      setBatchId(batch.batch_id)
      setSelected(new Set())
      queryClient.setQueryData(["scale-autolabel-latest"], batch)
      toast.success(t("autolabelBatchStarted"))
    },
    onError: (error) =>
      toast.error(t("autolabelBatchFailed"), {
        description: mlErrorMessage(error),
      }),
  })

  const images = imagesQuery.data?.data ?? []
  const selectableUnlabeled = images.filter(
    (image) =>
      !image.is_empty &&
      !image.existing_product_id &&
      !image.existing_product_name &&
      image.status === "unlabeled",
  )

  const toggle = (objectName: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(objectName)) next.delete(objectName)
      else next.add(objectName)
      return next
    })
  }

  const submitBatch = (retryOnly = false) => {
    const objectNames = retryOnly
      ? images
          .filter((image) => ["failed", "unmatched"].includes(image.status))
          .map((image) => image.object_name)
      : [...selected]
    if (objectNames.length === 0) {
      toast.error(t(retryOnly ? "noRetryableImages" : "noImagesSelected"))
      return
    }
    const includesExisting = images.some(
      (image) =>
        objectNames.includes(image.object_name) &&
        Boolean(image.existing_product_id || image.existing_product_name),
    )
    if (includesExisting && !window.confirm(t("confirmRelabelExisting"))) return
    batchMutation.mutate({
      objectNames,
      retryOnly,
      confirmExistingLabels: includesExisting,
    })
  }

  const testImage =
    images.find((image) => selected.has(image.object_name)) ??
    images.find((image) => !image.is_empty)

  const statusText = (status: ItemStatus) =>
    t(
      (
        {
          unlabeled: "statusUnlabeled",
          queued: "statusQueued",
          processing: "statusProcessing",
          matched: "statusMatched",
          unmatched: "statusUnmatched",
          failed: "statusFailed",
        } as const
      )[status],
    )

  return (
    <div className="flex flex-col gap-6 pt-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("autolabelConfiguration")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-4 flex flex-col gap-2">
            <Label htmlFor="autolabel-endpoint">{t("inferenceEndpoint")}</Label>
            <Input
              id="autolabel-endpoint"
              value={settingsForm.endpoint_url ?? ""}
              placeholder="http://192.168.0.29:8088/v1/files/inference"
              onChange={(event) =>
                setSettingsForm((current) => ({
                  ...current,
                  endpoint_url: event.target.value || null,
                }))
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="max-tokens">{t("maxTokens")}</Label>
            <Input
              id="max-tokens"
              type="number"
              min={1}
              max={4096}
              value={settingsForm.max_tokens}
              onChange={(event) =>
                setSettingsForm((current) => ({
                  ...current,
                  max_tokens: Number(event.target.value),
                }))
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="connect-timeout">{t("connectTimeout")}</Label>
            <Input
              id="connect-timeout"
              type="number"
              min={1}
              max={30}
              value={settingsForm.connect_timeout_seconds}
              onChange={(event) =>
                setSettingsForm((current) => ({
                  ...current,
                  connect_timeout_seconds: Number(event.target.value),
                }))
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="read-timeout">{t("readTimeout")}</Label>
            <Input
              id="read-timeout"
              type="number"
              min={1}
              max={600}
              value={settingsForm.read_timeout_seconds}
              onChange={(event) =>
                setSettingsForm((current) => ({
                  ...current,
                  read_timeout_seconds: Number(event.target.value),
                }))
              }
            />
          </div>
          <div className="flex items-end gap-2">
            <LoadingButton
              loading={saveSettingsMutation.isPending}
              onClick={() => saveSettingsMutation.mutate(settingsForm)}
            >
              {t("saveConfiguration")}
            </LoadingButton>
            <LoadingButton
              variant="outline"
              loading={testMutation.isPending}
              disabled={!testImage}
              onClick={() =>
                testImage && testMutation.mutate(testImage.object_name)
              }
            >
              {t("testEndpoint")}
            </LoadingButton>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={() =>
            setSelected(new Set(images.map((image) => image.object_name)))
          }
        >
          {t("selectCurrentPage")}
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            setSelected(
              new Set(selectableUnlabeled.map((image) => image.object_name)),
            )
          }
        >
          {t("selectOnlyUnlabeled")}
        </Button>
        <Button variant="outline" onClick={() => setSelected(new Set())}>
          {t("clearSelection")}
        </Button>
        <LoadingButton
          loading={batchMutation.isPending}
          onClick={() => submitBatch(false)}
        >
          {t("startAutolabeling")} ({selected.size})
        </LoadingButton>
        <Button variant="outline" onClick={() => submitBatch(true)}>
          {t("retryFailedUnmatched")}
        </Button>
      </div>

      {activeBatch && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-2 flex justify-between text-sm">
              <span>{t("batchProgress")}</span>
              <span>
                {activeBatch.completed} / {activeBatch.total}
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={t("batchProgress")}
              aria-valuemin={0}
              aria-valuemax={activeBatch.total}
              aria-valuenow={activeBatch.completed}
              className="h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full bg-primary transition-[width]"
                style={{
                  width: `${activeBatch.total ? (activeBatch.completed / activeBatch.total) * 100 : 0}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <span className="sr-only">{t("selectImage")}</span>
              </TableHead>
              <TableHead>{t("image")}</TableHead>
              <TableHead>{t("objectName")}</TableHead>
              <TableHead>{t("sessionCapture")}</TableHead>
              <TableHead>{t("existingLabel")}</TableHead>
              <TableHead>{t("autolabelResult")}</TableHead>
              <TableHead>{t("status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {images.map((image) => {
              const activeItem = activeItems.get(image.object_name)
              const status = activeItem?.status ?? image.status
              const productName =
                activeItem?.product_name ?? image.autolabel?.product_name
              return (
                <TableRow key={image.object_name}>
                  <TableCell>
                    <Checkbox
                      aria-label={`${t("selectImage")} ${image.object_name}`}
                      checked={selected.has(image.object_name)}
                      onCheckedChange={() => toggle(image.object_name)}
                    />
                  </TableCell>
                  <TableCell>
                    <ScaleImageThumbnail image={image} />
                  </TableCell>
                  <TableCell className="max-w-80 break-all font-mono text-xs">
                    {image.object_name}
                    {image.is_empty && (
                      <Badge variant="secondary" className="ml-2">
                        empty
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {image.session_id
                      ? `${image.session_id} / ${image.capture_index}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {image.existing_product_name ??
                      image.existing_product_id ??
                      "—"}
                  </TableCell>
                  <TableCell>
                    {productName ??
                      activeItem?.error ??
                      image.autolabel?.error ??
                      "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        status === "failed" ? "destructive" : "secondary"
                      }
                    >
                      {statusText(status)}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
            {!imagesQuery.isLoading && images.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground"
                >
                  {t("noScaleImages")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between">
        <Button
          variant="outline"
          disabled={cursorHistory.length === 0}
          onClick={() => {
            const history = [...cursorHistory]
            setCursor(history.pop() ?? null)
            setCursorHistory(history)
          }}
        >
          {t("previousPage")}
        </Button>
        <Button
          variant="outline"
          disabled={!imagesQuery.data?.next_cursor}
          onClick={() => {
            setCursorHistory((history) => [...history, cursor])
            setCursor(imagesQuery.data?.next_cursor ?? null)
            setSelected(new Set())
          }}
        >
          {t("nextPage")}
        </Button>
      </div>
    </div>
  )
}
