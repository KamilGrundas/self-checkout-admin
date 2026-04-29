import { useMutation, useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import mlApi, { mlErrorMessage } from "@/mlClient"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingButton } from "@/components/ui/loading-button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useI18n } from "@/i18n"

interface LabelStudioProject {
  id: number
  title: string
}

function useProjects() {
  return useQuery({
    queryKey: ["ls-projects"],
    queryFn: () =>
      mlApi
        .get<LabelStudioProject[]>("/label-studio/projects")
        .then((r) => r.data),
    retry: false,
  })
}

export function LabelStudioTab() {
  const { t } = useI18n()
  const { data: projects = [] } = useProjects()

  const [projectTitle, setProjectTitle] = useState("")
  const [releaseName, setReleaseName] = useState("")

  const syncMutation = useMutation({
    mutationFn: () => mlApi.post("/label-studio/sync").then((r) => r.data),
    onSuccess: () => toast.success(t("imagesSynced")),
    onError: (err) =>
      toast.error("Error", { description: mlErrorMessage(err) }),
  })

  const exportMutation = useMutation({
    mutationFn: () =>
      mlApi
        .post("/label-studio/export", null, {
          params: {
            project_title: projectTitle,
            ...(releaseName ? { release_name: releaseName } : {}),
          },
        })
        .then((r) => r.data),
    onSuccess: () => toast.success(t("datasetExported")),
    onError: (err) =>
      toast.error("Error", { description: mlErrorMessage(err) }),
  })

  const handleExport = (e: React.FormEvent) => {
    e.preventDefault()
    exportMutation.mutate()
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 pt-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("syncImages")}</CardTitle>
          <CardDescription>{t("labelStudioDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LoadingButton
            loading={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
          >
            {t("syncImages")}
          </LoadingButton>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("exportDataset")}</CardTitle>
          <CardDescription>{t("labelStudioDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleExport} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-title">{t("projectTitle")}</Label>
              {projects.length > 0 ? (
                <Select value={projectTitle} onValueChange={setProjectTitle}>
                  <SelectTrigger id="project-title">
                    <SelectValue placeholder={t("projectTitle")} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.title}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="project-title"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  placeholder="scale-products"
                  required
                />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="release-name">{t("releaseName")}</Label>
              <Input
                id="release-name"
                value={releaseName}
                onChange={(e) => setReleaseName(e.target.value)}
                placeholder="20241201-120000"
              />
            </div>
            <div>
              <LoadingButton
                type="submit"
                loading={exportMutation.isPending}
                disabled={!projectTitle}
              >
                {t("exportDataset")}
              </LoadingButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
