import { useMutation, useQuery } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingButton } from "@/components/ui/loading-button"
import { useI18n } from "@/i18n"
import mlApi, { mlErrorMessage } from "@/mlClient"
import { type DatasetManifest, getDatasetsQueryOptions } from "./DatasetsTab"

interface TrainRequest {
  yolo_datasets: string[]
  csv_datasets: string[]
  image_size: number
  epochs: number
  batch_size: number
  validation_ratio: number
}

interface TrainingJob {
  job_id: string
  status: "queued" | "running" | "completed" | "failed"
  stage: string
  message: string
  progress: number
  current_epoch?: number | null
  total_epochs: number
  metrics?: Record<string, number> | null
  error?: string | null
}

const TRAINING_JOB_STORAGE_KEY = "self-checkout-training-job-id"

export function TrainTab() {
  const { t } = useI18n()
  const { data: datasets = [] } = useQuery(getDatasetsQueryOptions())

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [imageSize, setImageSize] = useState(160)
  const [epochs, setEpochs] = useState(12)
  const [batchSize, setBatchSize] = useState(16)
  const [validationRatio, setValidationRatio] = useState(0.2)
  const [jobId, setJobId] = useState<string | null>(() =>
    localStorage.getItem(TRAINING_JOB_STORAGE_KEY),
  )
  const notifiedStatus = useRef<string | null>(null)

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
      mlApi.post<TrainingJob>("/train/classifier", body).then((r) => r.data),
    onSuccess: (job) => {
      setJobId(job.job_id)
      localStorage.setItem(TRAINING_JOB_STORAGE_KEY, job.job_id)
      toast.success(t("trainingStarted"))
    },
    onError: (err) =>
      toast.error("Error", { description: mlErrorMessage(err) }),
  })

  const { data: trainingJob } = useQuery({
    queryKey: ["training-job", jobId],
    queryFn: () =>
      mlApi
        .get<TrainingJob>(`/train/classifier/${jobId}`)
        .then((response) => response.data),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = (query.state.data as TrainingJob | undefined)?.status
      return status === "completed" || status === "failed" ? false : 1000
    },
    retry: false,
  })

  useEffect(() => {
    if (!trainingJob) return
    const notificationKey = `${trainingJob.job_id}:${trainingJob.status}`
    if (notifiedStatus.current === notificationKey) return

    if (trainingJob.status === "completed") {
      notifiedStatus.current = notificationKey
      toast.success(t("trainingCompleted"))
    } else if (trainingJob.status === "failed") {
      notifiedStatus.current = notificationKey
      toast.error(t("trainingFailed"), {
        description: trainingJob.error ?? trainingJob.message,
      })
    }
  }, [t, trainingJob])

  const trainingMessage = (() => {
    if (!trainingJob) return null
    switch (trainingJob.stage) {
      case "queued":
        return t("trainingQueued")
      case "downloading":
        return t("trainingDownloading")
      case "loading":
        return t("trainingLoading")
      case "preparing":
        return t("trainingPreparing")
      case "training":
        return trainingJob.current_epoch
          ? `${t("trainingEpoch")} ${trainingJob.current_epoch} / ${trainingJob.total_epochs}`
          : t("trainingStarting")
      case "evaluating":
        return t("trainingEvaluating")
      case "saving":
        return t("trainingRegistering")
      case "completed":
        return t("trainingCompleted")
      case "failed":
        return trainingJob.error ?? t("trainingFailed")
      default:
        return trainingJob.message
    }
  })()

  const isTraining =
    trainMutation.isPending ||
    trainingJob?.status === "queued" ||
    trainingJob?.status === "running"

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
          <p className="text-xs text-muted-foreground">
            {t("trainDatasetsDescription")}
          </p>
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
        <LoadingButton
          type="submit"
          loading={trainMutation.isPending}
          disabled={isTraining}
        >
          {t("trainClassifier")}
        </LoadingButton>
      </div>

      {trainingJob && trainingMessage && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="mb-2 flex items-center justify-between gap-4 text-sm">
            <span className="font-medium">{trainingMessage}</span>
            <span className="tabular-nums text-muted-foreground">
              {Math.round(trainingJob.progress)}%
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={t("trainingProgress")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(trainingJob.progress)}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500"
              style={{
                width: `${Math.min(100, Math.max(0, trainingJob.progress))}%`,
              }}
            />
          </div>
          {trainingJob.metrics?.accuracy !== undefined && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("trainingAccuracy")}:{" "}
              {(trainingJob.metrics.accuracy * 100).toFixed(1)}%
            </p>
          )}
        </div>
      )}
    </form>
  )
}
