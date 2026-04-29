import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import mlApi, { mlErrorMessage } from "@/mlClient"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { LoadingButton } from "@/components/ui/loading-button"
import { useI18n } from "@/i18n"

interface ModelRefresh {
  model_name: string
  model_version: number | null
  run_id: string
  cache_key: string
}

export function ModelsTab() {
  const { t } = useI18n()

  const classifierMutation = useMutation({
    mutationFn: () =>
      mlApi
        .post<ModelRefresh>("/inference/refresh-classify-model")
        .then((r) => r.data),
    onSuccess: (data) =>
      toast.success(t("classifierRefreshed"), {
        description: `${data.model_name} v${data.model_version ?? "?"}`,
      }),
    onError: (err) =>
      toast.error("Error", { description: mlErrorMessage(err) }),
  })

  const detectorMutation = useMutation({
    mutationFn: () =>
      mlApi
        .post<ModelRefresh>("/inference/refresh-detect-model")
        .then((r) => r.data),
    onSuccess: (data) =>
      toast.success(t("detectorRefreshed"), {
        description: `${data.model_name} v${data.model_version ?? "?"}`,
      }),
    onError: (err) =>
      toast.error("Error", { description: mlErrorMessage(err) }),
  })

  return (
    <div className="grid gap-4 md:grid-cols-2 pt-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("refreshClassifier")}</CardTitle>
          <CardDescription>{t("modelsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LoadingButton
            loading={classifierMutation.isPending}
            onClick={() => classifierMutation.mutate()}
          >
            {t("refreshClassifier")}
          </LoadingButton>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("refreshDetector")}</CardTitle>
          <CardDescription>{t("modelsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LoadingButton
            loading={detectorMutation.isPending}
            onClick={() => detectorMutation.mutate()}
          >
            {t("refreshDetector")}
          </LoadingButton>
        </CardContent>
      </Card>
    </div>
  )
}
