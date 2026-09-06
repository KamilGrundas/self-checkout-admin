import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BrainCircuit, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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

interface ModelVersion {
  name: string
  version: number
  model_id: string
  status: string
  description: string | null
  created_at: string | null
  is_active: boolean
  metrics: Record<string, number>
}

function formatTs(ts: string | null): string {
  if (!ts) return "—"
  const ms = Number(ts)
  return new Date(Number.isNaN(ms) ? ts : ms).toLocaleString()
}

function ModelTable({
  title,
  queryKey,
  listUrl,
  setUrl,
  deleteUrl,
}: {
  title: string
  queryKey: string
  listUrl: string
  setUrl: string
  deleteUrl: string
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [modelToDelete, setModelToDelete] = useState<ModelVersion | null>(null)

  const { data: versions = [], isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: () => mlApi.get<ModelVersion[]>(listUrl).then((r) => r.data),
    retry: false,
  })

  const activateMutation = useMutation({
    mutationFn: (version: number) =>
      mlApi.post(setUrl, { version }).then((r) => r.data),
    onSuccess: () => toast.success(t("modelActivated")),
    onError: (err) =>
      toast.error("Error", { description: mlErrorMessage(err) }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (version: number) =>
      mlApi.delete(`${deleteUrl}/${version}`).then((r) => r.data),
    onSuccess: () => {
      setModelToDelete(null)
      toast.success(t("modelDeleted"))
    },
    onError: (err) =>
      toast.error(t("modelDeleteFailed"), {
        description: mlErrorMessage(err),
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  })

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-semibold">{title}</h3>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : versions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="mb-3 rounded-full bg-muted p-3">
            <BrainCircuit className="size-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">{t("noModels")}</p>
          <p className="text-xs text-muted-foreground">
            {t("noModelsDescription")}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model ID</TableHead>
              <TableHead>{t("accuracy")}</TableHead>
              <TableHead>{t("validationAccuracy")}</TableHead>
              <TableHead>{t("createdAt")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead>{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {versions.map((v) => (
              <TableRow key={v.model_id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {v.model_id.slice(0, 8)}…
                </TableCell>
                <TableCell>
                  {v.metrics.accuracy === undefined
                    ? "—"
                    : `${(v.metrics.accuracy * 100).toFixed(1)}%`}
                </TableCell>
                <TableCell>
                  {v.metrics.val_accuracy === undefined
                    ? "—"
                    : `${(v.metrics.val_accuracy * 100).toFixed(1)}%`}
                </TableCell>
                <TableCell>{formatTs(v.created_at)}</TableCell>
                <TableCell>
                  {v.is_active ? (
                    <Badge>{t("active")}</Badge>
                  ) : (
                    <Badge variant="secondary">{v.status}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {!v.is_active && (
                      <LoadingButton
                        size="sm"
                        variant="outline"
                        loading={activateMutation.isPending}
                        onClick={() => activateMutation.mutate(v.version)}
                      >
                        {t("activate")}
                      </LoadingButton>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      aria-label={t("deleteModel")}
                      onClick={() => setModelToDelete(v)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog
        open={modelToDelete !== null}
        onOpenChange={(open) => !open && setModelToDelete(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("deleteModel")}</DialogTitle>
            <DialogDescription>{t("modelDeleteDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={deleteMutation.isPending}>
                {t("cancel")}
              </Button>
            </DialogClose>
            <LoadingButton
              variant="destructive"
              loading={deleteMutation.isPending}
              onClick={() =>
                modelToDelete && deleteMutation.mutate(modelToDelete.version)
              }
            >
              {t("delete")}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function ModelsTab() {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-8 pt-4">
      <ModelTable
        title={t("selectClassifierModel")}
        queryKey="ml-classify-models"
        listUrl="/inference/classify-models"
        setUrl="/inference/set-classify-model"
        deleteUrl="/inference/classify-models"
      />
      <ModelTable
        title={t("selectDetectorModel")}
        queryKey="ml-detect-models"
        listUrl="/inference/detect-models"
        setUrl="/inference/set-detect-model"
        deleteUrl="/inference/detect-models"
      />
    </div>
  )
}
