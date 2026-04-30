import { useMutation, useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import mlApi, { mlErrorMessage } from "@/mlClient"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingButton } from "@/components/ui/loading-button"
import { useI18n } from "@/i18n"
import { getDatasetsQueryOptions, type DatasetManifest } from "./DatasetsTab"

interface TrainRequest {
  yolo_datasets: string[]
  csv_datasets: string[]
  image_size: number
  epochs: number
  batch_size: number
  validation_ratio: number
}

export function TrainTab() {
  const { t } = useI18n()
  const { data: datasets = [] } = useQuery(getDatasetsQueryOptions())

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [imageSize, setImageSize] = useState(160)
  const [epochs, setEpochs] = useState(12)
  const [batchSize, setBatchSize] = useState(16)
  const [validationRatio, setValidationRatio] = useState(0.2)

  const toggleDataset = (prefix: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(prefix)) next.delete(prefix)
      else next.add(prefix)
      return next
    })
  }

  const trainMutation = useMutation({
    mutationFn: (body: TrainRequest) =>
      mlApi.post("/train/classifier", body).then((r) => r.data),
    onSuccess: () => toast.success(t("trainingStarted")),
    onError: (err) =>
      toast.error("Error", { description: mlErrorMessage(err) }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selected.size === 0) {
      toast.error(t("noYoloDatasetsSelected"))
      return
    }
    const yolo: string[] = []
    const csv: string[] = []
    for (const prefix of selected) {
      const ds = datasets.find((d) => d.release_prefix === prefix)
      if (ds?.export_type === "CSV") csv.push(prefix)
      else yolo.push(prefix)
    }
    trainMutation.mutate({
      yolo_datasets: yolo,
      csv_datasets: csv,
      image_size: imageSize,
      epochs,
      batch_size: batchSize,
      validation_ratio: validationRatio,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 pt-4 max-w-lg">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label>{t("datasets")}</Label>
          <p className="text-xs text-muted-foreground">{t("trainDatasetsDescription")}</p>
        </div>
        {datasets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("noDatasetsDescription")}
          </p>
        ) : (
          datasets.map((ds: DatasetManifest) => (
            <div key={ds.release_prefix} className="flex items-center gap-2">
              <Checkbox
                id={ds.release_prefix}
                checked={selected.has(ds.release_prefix)}
                onCheckedChange={() => toggleDataset(ds.release_prefix)}
              />
              <label
                htmlFor={ds.release_prefix}
                className="text-sm cursor-pointer"
              >
                {ds.project_title ?? ds.project_slug} — {ds.release_name}
                {ds.export_type && (
                  <span className="ml-1 text-muted-foreground">
                    ({ds.export_type})
                  </span>
                )}
              </label>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="image-size">{t("imageSize")}</Label>
          <Input
            id="image-size"
            type="number"
            value={imageSize}
            min={32}
            max={640}
            onChange={(e) => setImageSize(Number(e.target.value))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="epochs">{t("epochs")}</Label>
          <Input
            id="epochs"
            type="number"
            value={epochs}
            min={1}
            max={200}
            onChange={(e) => setEpochs(Number(e.target.value))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="batch-size">{t("batchSize")}</Label>
          <Input
            id="batch-size"
            type="number"
            value={batchSize}
            min={1}
            max={256}
            onChange={(e) => setBatchSize(Number(e.target.value))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="validation-ratio">{t("validationRatio")}</Label>
          <Input
            id="validation-ratio"
            type="number"
            value={validationRatio}
            min={0.05}
            max={0.5}
            step={0.05}
            onChange={(e) => setValidationRatio(Number(e.target.value))}
          />
        </div>
      </div>

      <div>
        <LoadingButton type="submit" loading={trainMutation.isPending}>
          {t("trainClassifier")}
        </LoadingButton>
      </div>
    </form>
  )
}
