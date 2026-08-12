import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { ProductsService, SystemSettingsService } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  captured_at: string | null
  is_empty: boolean
  is_imported: boolean
  existing_product_id: string | null
  existing_product_name: string | null
  autolabel: AutolabelResult | null
  status: ItemStatus
}

interface ScaleImagesPage {
  data: ScaleImage[]
  next_cursor: string | null
}

interface LabelCounts {
  total: number
  labels: Array<{
    product_id: string
    product_name: string
    count: number
  }>
}

interface FinalizeJob {
  job_id: string
  status: "queued" | "processing" | "completed" | "failed"
  moved: number
  error: string | null
}

interface FinalizeRequest {
  object_names: string[]
  selection: "explicit" | "all_matched"
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

type BulkSelection = "all_non_empty" | "all_matched"

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

export function LabelTab() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkSelection, setBulkSelection] = useState<BulkSelection | null>(null)
  const [bulkSelectionCount, setBulkSelectionCount] = useState(0)
  const [autolabelRunning, setAutolabelRunning] = useState(false)
  const [settingsForm, setSettingsForm] =
    useState<SettingsForm>(defaultSettings)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [labelProductId, setLabelProductId] = useState("")
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [finalizeJobId, setFinalizeJobId] = useState<string | null>(null)
  const [pendingMove, setPendingMove] = useState<FinalizeRequest | null>(null)

  const productsQuery = useQuery({
    queryKey: ["products-for-labeling"],
    queryFn: () => ProductsService.readProducts({ limit: 500 }),
  })

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

  const imagesQuery = useInfiniteQuery({
    queryKey: ["scale-images", labelProductId],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      mlApi
        .get<ScaleImagesPage>("/autolabel/scale/images", {
          params: {
            cursor: pageParam,
            page_size: 100,
            label_product_id: labelProductId || undefined,
          },
        })
        .then((response) => response.data),
    getNextPageParam: (page) => page.next_cursor ?? undefined,
    refetchInterval: autolabelRunning ? 2000 : false,
  })

  const labelCountsQuery = useQuery({
    queryKey: ["scale-image-label-counts"],
    queryFn: () =>
      mlApi
        .get<LabelCounts>("/autolabel/scale/images/label-counts")
        .then((response) => response.data),
    refetchInterval: autolabelRunning ? 2000 : false,
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
    if (latestBatchQuery.data) {
      setBatchId(latestBatchQuery.data.batch_id)
      setAutolabelRunning(
        latestBatchQuery.data.status === "queued" ||
          latestBatchQuery.data.status === "processing",
      )
    }
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

  const finalizeJobQuery = useQuery({
    queryKey: ["scale-finalize-job", finalizeJobId],
    queryFn: () =>
      mlApi
        .get<FinalizeJob>(`/autolabel/scale/images/finalize/${finalizeJobId}`)
        .then((response) => response.data),
    enabled: Boolean(finalizeJobId),
    retry: false,
    refetchInterval: (query) => {
      const job = query.state.data as FinalizeJob | undefined
      return job?.status === "completed" || job?.status === "failed"
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
      setAutolabelRunning(false)
      void queryClient.invalidateQueries({ queryKey: ["scale-images"] })
      void queryClient.invalidateQueries({
        queryKey: ["scale-image-label-counts"],
      })
    }
  }, [activeBatch?.status, queryClient])

  useEffect(() => {
    const job = finalizeJobQuery.data
    if (job?.status === "completed") {
      setFinalizeJobId(null)
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["scale-images"] }),
        queryClient.invalidateQueries({ queryKey: ["labeled-images"] }),
        queryClient.invalidateQueries({
          queryKey: ["scale-image-label-counts"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["labeled-image-label-counts"],
        }),
      ]).finally(() => setPendingMove(null))
      toast.success(t("imagesMoved"))
    } else if (job?.status === "failed") {
      setFinalizeJobId(null)
      setPendingMove(null)
      toast.error(t("imagesMoveFailed"), {
        description: job.error ?? undefined,
      })
    }
  }, [finalizeJobQuery.data, queryClient, t])

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
      selection,
    }: {
      objectNames: string[]
      retryOnly: boolean
      selection: "explicit" | "all_non_empty"
    }) =>
      mlApi
        .post<Batch>(
          "/autolabel/scale/batches",
          {
            object_names: objectNames,
            selection,
            retry_only: retryOnly,
          },
          {
            headers: { "Idempotency-Key": createIdempotencyKey() },
          },
        )
        .then((response) => response.data),
    onSuccess: (batch) => {
      setBatchId(batch.batch_id)
      setAutolabelRunning(true)
      setSelected(new Set())
      setBulkSelection(null)
      setBulkSelectionCount(0)
      queryClient.setQueryData(["scale-autolabel-latest"], batch)
      toast.success(t("autolabelBatchStarted"))
    },
    onError: (error) =>
      toast.error(t("autolabelBatchFailed"), {
        description: mlErrorMessage(error),
      }),
  })

  const labelMutation = useMutation({
    mutationFn: ({
      objectName,
      productId,
    }: {
      objectName: string
      productId: string
    }) =>
      mlApi
        .patch("/autolabel/scale/images/label", {
          object_name: objectName,
          product_id: productId,
        })
        .then((response) => response.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["scale-images"] })
      void queryClient.invalidateQueries({
        queryKey: ["scale-image-label-counts"],
      })
    },
    onError: (error) =>
      toast.error(t("labelUpdateFailed"), {
        description: mlErrorMessage(error),
      }),
  })

  const importMutation = useMutation({
    mutationFn: () => {
      const body = new FormData()
      for (const file of files) body.append("files", file)
      return mlApi
        .post("/datasets/scale-images", body)
        .then((response) => response.data)
    },
    onSuccess: () => {
      setFiles([])
      void queryClient.invalidateQueries({ queryKey: ["scale-images"] })
      void queryClient.invalidateQueries({
        queryKey: ["scale-image-label-counts"],
      })
      toast.success(t("imagesImportedForLabeling"))
    },
    onError: (error) =>
      toast.error(t("imagesImportFailed"), {
        description: mlErrorMessage(error),
      }),
  })

  const finalizeMutation = useMutation({
    mutationFn: (request: FinalizeRequest) =>
      mlApi
        .post("/autolabel/scale/images/finalize", request, { timeout: 0 })
        .then((response) => response.data),
    onSuccess: (result, request) => {
      setMoveDialogOpen(false)
      setPendingMove(request)
      setSelected(new Set())
      setBulkSelection(null)
      setBulkSelectionCount(0)
      if (result.queued && result.job_id) {
        setFinalizeJobId(result.job_id)
        toast.success(t("imagesMoveStarted"))
        return
      }
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["scale-images"] }),
        queryClient.invalidateQueries({ queryKey: ["labeled-images"] }),
        queryClient.invalidateQueries({
          queryKey: ["scale-image-label-counts"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["labeled-image-label-counts"],
        }),
      ]).finally(() => setPendingMove(null))
      toast.success(t("imagesMoved"))
    },
    onError: (error) => {
      setPendingMove(null)
      toast.error(t("imagesMoveFailed"), {
        description: mlErrorMessage(error),
      })
    },
  })

  const selectionCountMutation = useMutation({
    mutationFn: (selection: BulkSelection) =>
      mlApi
        .post<{ count: number }>("/autolabel/scale/images/selection-count", {
          selection,
        })
        .then((response) => ({ selection, count: response.data.count })),
    onSuccess: ({ selection, count }) => {
      setSelected(new Set())
      setBulkSelection(selection)
      setBulkSelectionCount(count)
    },
    onError: (error) =>
      toast.error(t("imagesLoadFailed"), {
        description: mlErrorMessage(error),
      }),
  })

  const imageStatus = (image: ScaleImage) =>
    activeItems.get(image.object_name)?.status ?? image.status

  const loadedImages =
    imagesQuery.data?.pages.flatMap((page) => page.data) ?? []
  const pendingObjectNames = new Set(pendingMove?.object_names ?? [])
  const images = loadedImages.filter(
    (image) =>
      !pendingObjectNames.has(image.object_name) &&
      !(
        pendingMove?.selection === "all_matched" &&
        imageStatus(image) === "matched"
      ),
  )
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && imagesQuery.hasNextPage) {
        void imagesQuery.fetchNextPage()
      }
    })
    observer.observe(target)
    return () => observer.disconnect()
  }, [imagesQuery.fetchNextPage, imagesQuery.hasNextPage])

  const matchesBulkSelection = (image: ScaleImage) =>
    bulkSelection === "all_non_empty"
      ? !image.is_empty
      : bulkSelection === "all_matched"
        ? imageStatus(image) === "matched"
        : false

  const isSelected = (image: ScaleImage) =>
    bulkSelection
      ? matchesBulkSelection(image)
      : selected.has(image.object_name)

  const toggle = (objectName: string) => {
    setSelected((current) => {
      const next = bulkSelection
        ? new Set(
            images
              .filter((image) => matchesBulkSelection(image))
              .map((image) => image.object_name),
          )
        : new Set(current)
      if (next.has(objectName)) next.delete(objectName)
      else next.add(objectName)
      return next
    })
    setBulkSelection(null)
    setBulkSelectionCount(0)
  }

  const submitBatch = (retryOnly = false) => {
    const useBulkSelection = !retryOnly && bulkSelection === "all_non_empty"
    const objectNames = retryOnly
      ? images
          .filter((image) => ["failed", "unmatched"].includes(image.status))
          .map((image) => image.object_name)
      : [...selected]
    if (!useBulkSelection && objectNames.length === 0) {
      toast.error(t(retryOnly ? "noRetryableImages" : "noImagesSelected"))
      return
    }
    batchMutation.mutate({
      objectNames,
      retryOnly,
      selection: useBulkSelection ? "all_non_empty" : "explicit",
    })
  }

  const testImage =
    images.find((image) => selected.has(image.object_name)) ??
    images.find((image) => !image.is_empty)

  const moveCount =
    bulkSelection === "all_matched" ? bulkSelectionCount : selected.size
  const moveRequest: FinalizeRequest = {
    object_names: bulkSelection === "all_matched" ? [] : [...selected],
    selection: bulkSelection === "all_matched" ? "all_matched" : "explicit",
  }

  const selectLabelFilter = (productId: string) => {
    setLabelProductId(productId)
    setSelected(new Set())
    setBulkSelection(null)
    setBulkSelectionCount(0)
  }

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
      <div className="rounded-md border p-4">
        <h3 className="mb-4 font-semibold">{t("importImagesForLabeling")}</h3>
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="flex flex-col gap-2">
            <Label htmlFor="label-images">{t("images")}</Label>
            <Input
              id="label-images"
              type="file"
              accept="image/*"
              multiple
              onChange={(event) =>
                setFiles(Array.from(event.target.files ?? []))
              }
            />
          </div>
          <LoadingButton
            loading={importMutation.isPending}
            disabled={files.length === 0}
            onClick={() => importMutation.mutate()}
          >
            {t("importImages")} ({files.length})
          </LoadingButton>
        </div>
      </div>

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
          onClick={() => {
            setBulkSelection(null)
            setBulkSelectionCount(0)
            setSelected(new Set(images.map((image) => image.object_name)))
          }}
        >
          {t("selectCurrentPage")}
        </Button>
        <Button
          variant="outline"
          disabled={selectionCountMutation.isPending}
          onClick={() => selectionCountMutation.mutate("all_non_empty")}
        >
          {t("selectAllForAutolabeling")}
        </Button>
        <Button
          variant="outline"
          disabled={selectionCountMutation.isPending}
          onClick={() => selectionCountMutation.mutate("all_matched")}
        >
          {t("selectAllMatched")}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setSelected(new Set())
            setBulkSelection(null)
            setBulkSelectionCount(0)
          }}
        >
          {t("clearSelection")}
        </Button>
        <LoadingButton
          loading={batchMutation.isPending}
          disabled={bulkSelection === "all_matched"}
          onClick={() => submitBatch(false)}
        >
          {t("startAutolabeling")} (
          {bulkSelection === "all_non_empty"
            ? bulkSelectionCount
            : selected.size}
          )
        </LoadingButton>
        <Button variant="outline" onClick={() => submitBatch(true)}>
          {t("retryFailedUnmatched")}
        </Button>
        <LoadingButton
          loading={finalizeMutation.isPending}
          disabled={
            bulkSelection === "all_non_empty" ||
            (!bulkSelection && selected.size === 0)
          }
          onClick={() => setMoveDialogOpen(true)}
        >
          {t("moveToImages")} ({moveCount})
        </LoadingButton>
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

      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="sr-only">{t("label")}</legend>
        <Button
          size="sm"
          variant={labelProductId ? "outline" : "default"}
          onClick={() => selectLabelFilter("")}
        >
          {t("allImages")} ({labelCountsQuery.data?.total ?? 0})
        </Button>
        {(labelCountsQuery.data?.labels ?? []).map((labelCount) => (
          <Button
            key={labelCount.product_id}
            size="sm"
            variant={
              labelProductId === labelCount.product_id ? "default" : "outline"
            }
            onClick={() => selectLabelFilter(labelCount.product_id)}
          >
            {labelCount.product_name} ({labelCount.count})
          </Button>
        ))}
      </fieldset>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <span className="sr-only">{t("selectImage")}</span>
              </TableHead>
              <TableHead>{t("image")}</TableHead>
              <TableHead>{t("capturedAt")}</TableHead>
              <TableHead>{t("selectedLabel")}</TableHead>
              <TableHead>{t("label")}</TableHead>
              <TableHead>{t("status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {images.map((image) => {
              const activeItem = activeItems.get(image.object_name)
              const status = activeItem?.status ?? image.status
              const productName =
                activeItem?.product_name ?? image.autolabel?.product_name
              const productId =
                activeItem?.product_id ?? image.autolabel?.product_id
              const differs = Boolean(
                productName &&
                  (image.existing_product_id || image.existing_product_name) &&
                  (image.existing_product_id
                    ? image.existing_product_id !== productId
                    : image.existing_product_name !== productName),
              )
              return (
                <TableRow
                  key={image.object_name}
                  className={
                    differs
                      ? "bg-orange-100/70 dark:bg-orange-950/30"
                      : undefined
                  }
                >
                  <TableCell>
                    <Checkbox
                      aria-label={`${t("selectImage")} ${image.object_name}`}
                      checked={isSelected(image)}
                      onCheckedChange={() => toggle(image.object_name)}
                    />
                  </TableCell>
                  <TableCell>
                    <ScaleImageThumbnail image={image} />
                  </TableCell>
                  <TableCell>
                    {image.captured_at
                      ? new Date(image.captured_at).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {image.is_imported
                      ? t("imported")
                      : (image.existing_product_name ??
                        image.existing_product_id ??
                        "—")}
                  </TableCell>
                  <TableCell>
                    <select
                      className="h-9 min-w-48 rounded-md border bg-background px-3 text-sm"
                      aria-label={`${t("label")} ${image.object_name}`}
                      value={productId ?? ""}
                      onChange={(event) =>
                        labelMutation.mutate({
                          objectName: image.object_name,
                          productId: event.target.value,
                        })
                      }
                    >
                      <option value="" disabled>
                        {activeItem?.error ??
                          image.autolabel?.error ??
                          t("selectLabel")}
                      </option>
                      {(productsQuery.data?.data ?? []).map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
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
                  colSpan={6}
                  className="text-center text-muted-foreground"
                >
                  {t("noScaleImages")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div ref={loadMoreRef} className="flex h-12 items-center justify-center">
        {imagesQuery.isFetchingNextPage && t("loadingMoreImages")}
      </div>

      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirmMove")}</DialogTitle>
            <DialogDescription>
              {t("confirmMoveQuestion").replace("{count}", String(moveCount))}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
              {t("no")}
            </Button>
            <LoadingButton
              loading={finalizeMutation.isPending}
              onClick={() => finalizeMutation.mutate(moveRequest)}
            >
              {t("yes")}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
