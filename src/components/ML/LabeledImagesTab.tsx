import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { ProductsService } from "@/client"
import { Button } from "@/components/ui/button"
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

interface LabeledImage {
  object_name: string
  image_url: string
  size: number
  etag: string | null
  captured_at: string | null
  product_id: string
  product_name: string
}

interface LabeledImagesPage {
  data: LabeledImage[]
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

interface DuplicateScan {
  job_id: string
  status: "queued" | "processing" | "completed" | "failed"
  processed: number
  total: number
  progress: number
  duplicate_count: number
  similarity_threshold: number
  error: string | null
}

function Thumbnail({ image }: { image: LabeledImage }) {
  const query = useQuery({
    queryKey: ["labeled-thumbnail", image.object_name, image.etag],
    queryFn: () =>
      mlApi
        .get<Blob>(image.image_url, {
          params: { object_name: image.object_name },
          responseType: "blob",
        })
        .then((response) => response.data),
    staleTime: 60_000,
  })
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    if (!query.data) return
    const next = URL.createObjectURL(query.data)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [query.data])

  return (
    <img
      src={url}
      alt={image.product_name}
      className="size-20 rounded object-cover"
    />
  )
}

export function LabeledImagesTab() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [productId, setProductId] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [releaseName, setReleaseName] = useState("labeled-images")
  const [duplicateJobId, setDuplicateJobId] = useState<string | null>(null)
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false)
  const [labelProductId, setLabelProductId] = useState("")

  const productsQuery = useQuery({
    queryKey: ["products-for-labeling"],
    queryFn: () => ProductsService.readProducts({ limit: 500 }),
  })
  const products = productsQuery.data?.data ?? []
  const imagesQuery = useInfiniteQuery({
    queryKey: ["labeled-images", labelProductId],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      mlApi
        .get<LabeledImagesPage>("/datasets/images", {
          params: {
            cursor: pageParam,
            page_size: 100,
            label_product_id: labelProductId || undefined,
          },
        })
        .then((response) => response.data),
    getNextPageParam: (page) => page.next_cursor ?? undefined,
  })
  const labelCountsQuery = useQuery({
    queryKey: ["labeled-image-label-counts"],
    queryFn: () =>
      mlApi
        .get<LabelCounts>("/datasets/images/label-counts")
        .then((response) => response.data),
  })
  const images = imagesQuery.data?.pages.flatMap((page) => page.data) ?? []
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

  const duplicateScanQuery = useQuery({
    queryKey: ["duplicate-scan", duplicateJobId],
    queryFn: () =>
      mlApi
        .get<DuplicateScan>(`/datasets/images/duplicates/${duplicateJobId}`)
        .then((response) => response.data),
    enabled: Boolean(duplicateJobId),
    refetchInterval: (query) => {
      const scan = query.state.data as DuplicateScan | undefined
      return scan?.status === "completed" || scan?.status === "failed"
        ? false
        : 1000
    },
  })

  useEffect(() => {
    if (duplicateScanQuery.data?.status === "completed") {
      setDuplicateDialogOpen(true)
    }
    if (duplicateScanQuery.data?.status === "failed") {
      toast.error(t("duplicateScanFailed"), {
        description: duplicateScanQuery.data.error ?? undefined,
      })
    }
  }, [duplicateScanQuery.data, t])

  const importMutation = useMutation({
    mutationFn: () => {
      const product = products.find((item) => item.id === productId)
      if (!product) throw new Error(t("selectLabel"))
      const body = new FormData()
      body.append("product_id", product.id)
      for (const file of files) body.append("files", file)
      return mlApi
        .post("/datasets/images/import", body)
        .then((response) => response.data)
    },
    onSuccess: () => {
      setFiles([])
      void queryClient.invalidateQueries({ queryKey: ["labeled-images"] })
      void queryClient.invalidateQueries({
        queryKey: ["labeled-image-label-counts"],
      })
      toast.success(t("imagesImported"))
    },
    onError: (error) =>
      toast.error(t("imagesImportFailed"), {
        description: mlErrorMessage(error),
      }),
  })

  const labelMutation = useMutation({
    mutationFn: ({
      image,
      nextProductId,
    }: {
      image: LabeledImage
      nextProductId: string
    }) => {
      const product = products.find((item) => item.id === nextProductId)
      if (!product) throw new Error(t("selectLabel"))
      return mlApi
        .patch("/datasets/images/label", {
          object_name: image.object_name,
          product_id: product.id,
        })
        .then((response) => response.data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["labeled-images"] })
      void queryClient.invalidateQueries({
        queryKey: ["labeled-image-label-counts"],
      })
    },
    onError: (error) =>
      toast.error(t("labelUpdateFailed"), {
        description: mlErrorMessage(error),
      }),
  })

  const exportMutation = useMutation({
    mutationFn: () =>
      mlApi
        .post("/datasets/images/export", {
          object_names: [...selected],
          release_name: releaseName,
        })
        .then((response) => response.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["ml-datasets"] })
      toast.success(t("datasetExported"))
    },
    onError: (error) =>
      toast.error(t("datasetExportFailed"), {
        description: mlErrorMessage(error),
      }),
  })

  const selectAllMutation = useMutation({
    mutationFn: async () => {
      const objectNames: string[] = []
      let nextCursor: string | null = null
      do {
        const response: { data: LabeledImagesPage } = await mlApi.get(
          "/datasets/images",
          {
            params: {
              cursor: nextCursor,
              page_size: 100,
              label_product_id: labelProductId || undefined,
            },
          },
        )
        objectNames.push(
          ...response.data.data.map((image) => image.object_name),
        )
        nextCursor = response.data.next_cursor
      } while (nextCursor)
      return objectNames
    },
    onSuccess: (objectNames) => setSelected(new Set(objectNames)),
    onError: (error) =>
      toast.error(t("imagesLoadFailed"), {
        description: mlErrorMessage(error),
      }),
  })

  const duplicateScanMutation = useMutation({
    mutationFn: () =>
      mlApi
        .post<DuplicateScan>("/datasets/images/duplicates")
        .then((response) => response.data),
    onSuccess: (scan) => setDuplicateJobId(scan.job_id),
    onError: (error) =>
      toast.error(t("duplicateScanFailed"), {
        description: mlErrorMessage(error),
      }),
  })

  const deleteDuplicatesMutation = useMutation({
    mutationFn: () =>
      mlApi
        .delete(`/datasets/images/duplicates/${duplicateJobId}`)
        .then((response) => response.data),
    onSuccess: () => {
      setDuplicateDialogOpen(false)
      setDuplicateJobId(null)
      void queryClient.invalidateQueries({ queryKey: ["labeled-images"] })
      void queryClient.invalidateQueries({
        queryKey: ["labeled-image-label-counts"],
      })
      toast.success(t("duplicatesDeleted"))
    },
    onError: (error) =>
      toast.error(t("duplicatesDeleteFailed"), {
        description: mlErrorMessage(error),
      }),
  })

  const toggle = (objectName: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(objectName)) next.delete(objectName)
      else next.add(objectName)
      return next
    })
  }

  const selectLabelFilter = (productId: string) => {
    setLabelProductId(productId)
    setSelected(new Set())
  }

  return (
    <div className="flex flex-col gap-6 pt-4">
      <div className="rounded-md border p-4">
        <h3 className="mb-4 font-semibold">{t("importLabeledImages")}</h3>
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div className="flex flex-col gap-2">
            <Label htmlFor="bulk-label">{t("label")}</Label>
            <select
              id="bulk-label"
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
            >
              <option value="">{t("selectLabel")}</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bulk-images">{t("images")}</Label>
            <Input
              id="bulk-images"
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
            disabled={!productId || files.length === 0}
            onClick={() => importMutation.mutate()}
          >
            {t("importImages")} ({files.length})
          </LoadingButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <LoadingButton
          variant="outline"
          loading={selectAllMutation.isPending}
          onClick={() => selectAllMutation.mutate()}
        >
          {t("selectAllImages")}
        </LoadingButton>
        <Button variant="outline" onClick={() => setSelected(new Set())}>
          {t("clearSelection")}
        </Button>
        <LoadingButton
          variant="outline"
          loading={
            duplicateScanMutation.isPending ||
            duplicateScanQuery.data?.status === "queued" ||
            duplicateScanQuery.data?.status === "processing"
          }
          onClick={() => duplicateScanMutation.mutate()}
        >
          {t("detectDuplicates")}
        </LoadingButton>
        <Input
          className="w-48"
          aria-label={t("datasetName")}
          value={releaseName}
          onChange={(event) => setReleaseName(event.target.value)}
        />
        <LoadingButton
          loading={exportMutation.isPending}
          disabled={selected.size === 0}
          onClick={() => exportMutation.mutate()}
        >
          {t("exportDataset")} ({selected.size})
        </LoadingButton>
      </div>

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
              <TableHead className="w-10" />
              <TableHead>{t("image")}</TableHead>
              <TableHead>{t("capturedAt")}</TableHead>
              <TableHead>{t("label")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {images.map((image) => (
              <TableRow key={image.object_name}>
                <TableCell>
                  <Checkbox
                    aria-label={`${t("selectImage")} ${image.object_name}`}
                    checked={selected.has(image.object_name)}
                    onCheckedChange={() => toggle(image.object_name)}
                  />
                </TableCell>
                <TableCell>
                  <Thumbnail image={image} />
                </TableCell>
                <TableCell>
                  {image.captured_at
                    ? new Date(image.captured_at).toLocaleString()
                    : "—"}
                </TableCell>
                <TableCell>
                  <select
                    className="h-9 min-w-48 rounded-md border bg-background px-3 text-sm"
                    value={image.product_id}
                    onChange={(event) =>
                      labelMutation.mutate({
                        image,
                        nextProductId: event.target.value,
                      })
                    }
                  >
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </TableCell>
              </TableRow>
            ))}
            {!imagesQuery.isLoading && images.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-muted-foreground"
                >
                  {t("noLabeledImages")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div ref={loadMoreRef} className="flex h-12 items-center justify-center">
        {imagesQuery.isFetchingNextPage && t("loadingMoreImages")}
      </div>

      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("duplicatesDetected")}</DialogTitle>
            <DialogDescription>
              {t("duplicatesDetectedQuestion").replace(
                "{count}",
                String(duplicateScanQuery.data?.duplicate_count ?? 0),
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDuplicateDialogOpen(false)}
            >
              {t("no")}
            </Button>
            <LoadingButton
              loading={deleteDuplicatesMutation.isPending}
              disabled={!duplicateScanQuery.data?.duplicate_count}
              onClick={() => deleteDuplicatesMutation.mutate()}
            >
              {t("yes")}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
