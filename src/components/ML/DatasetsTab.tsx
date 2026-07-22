import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { DatabaseZap, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

export interface DatasetManifest {
  project_slug: string
  project_title?: string
  release_name: string
  export_type?: string
  sample_count?: number
  created_at?: string
  release_prefix: string
  bucket: string
}

export function getDatasetsQueryOptions() {
  return {
    queryKey: ["ml-datasets"],
    queryFn: () =>
      mlApi.get<DatasetManifest[]>("/datasets/training").then((r) => r.data),
  }
}

function DeleteDataset({ dataset }: { dataset: DatasetManifest }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      mlApi
        .delete(
          `/datasets/training/${dataset.project_slug}/${dataset.release_name}`,
        )
        .then((r) => r.data),
    onSuccess: () => {
      toast.success(t("datasetDeleted"))
      setOpen(false)
    },
    onError: (err) =>
      toast.error("Error", { description: mlErrorMessage(err) }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["ml-datasets"] }),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("deleteDataset")}</DialogTitle>
          <DialogDescription>{t("datasetDeleteDescription")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={mutation.isPending}>
              {t("cancel")}
            </Button>
          </DialogClose>
          <LoadingButton
            variant="destructive"
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {t("delete")}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DatasetsTab() {
  const { t } = useI18n()
  const { data: datasets = [], isLoading } = useQuery(getDatasetsQueryOptions())

  if (isLoading) {
    return <div className="pt-4 text-muted-foreground text-sm">Loading...</div>
  }

  if (datasets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center pt-4">
        <div className="mb-4 rounded-full bg-muted p-4">
          <DatabaseZap className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">{t("noDatasets")}</h3>
        <p className="text-muted-foreground">{t("noDatasetsDescription")}</p>
      </div>
    )
  }

  return (
    <div className="pt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("name")}</TableHead>
            <TableHead>{t("release")}</TableHead>
            <TableHead>{t("exportType")}</TableHead>
            <TableHead>{t("sampleCount")}</TableHead>
            <TableHead>{t("createdAt")}</TableHead>
            <TableHead>{t("actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {datasets.map((ds) => (
            <TableRow key={ds.release_prefix}>
              <TableCell className="font-medium">
                {ds.project_title ?? ds.project_slug}
              </TableCell>
              <TableCell>{ds.release_name}</TableCell>
              <TableCell>{ds.export_type ?? "—"}</TableCell>
              <TableCell>{ds.sample_count ?? "—"}</TableCell>
              <TableCell>
                {ds.created_at ? new Date(ds.created_at).toLocaleString() : "—"}
              </TableCell>
              <TableCell>
                <DeleteDataset dataset={ds} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
