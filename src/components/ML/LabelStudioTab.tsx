import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

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
import mlApi, { mlErrorMessage } from "@/mlClient"

interface LabelStudioProject {
  id: number
  title: string
}

function labelStudioRequestConfig(apiKey: string) {
  return {
    headers: {
      "X-Label-Studio-Api-Key": apiKey,
    },
  }
}

export function LabelStudioTab() {
  const { t } = useI18n()

  const [apiKey, setApiKey] = useState("")
  const [connectedApiKey, setConnectedApiKey] = useState("")
  const [projects, setProjects] = useState<LabelStudioProject[]>([])
  const [projectTitle, setProjectTitle] = useState("")
  const [releaseName, setReleaseName] = useState("")

  const connectMutation = useMutation({
    mutationFn: (key: string) =>
      mlApi
        .get<LabelStudioProject[]>(
          "/label-studio/projects",
          labelStudioRequestConfig(key),
        )
        .then((r) => r.data),
    onSuccess: (data, key) => {
      setConnectedApiKey(key)
      setProjects(data)
      toast.success(t("labelStudioConnected"))
    },
    onError: (err) => {
      setConnectedApiKey("")
      setProjects([])
      toast.error("Error", { description: mlErrorMessage(err) })
    },
  })

  const syncMutation = useMutation({
    mutationFn: () =>
      mlApi
        .post(
          "/label-studio/sync",
          null,
          labelStudioRequestConfig(connectedApiKey),
        )
        .then((r) => r.data),
    onSuccess: () => toast.success(t("imagesSynced")),
    onError: (err) =>
      toast.error("Error", { description: mlErrorMessage(err) }),
  })

  const exportMutation = useMutation({
    mutationFn: () =>
      mlApi
        .post("/label-studio/export", null, {
          ...labelStudioRequestConfig(connectedApiKey),
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

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault()
    connectMutation.mutate(apiKey.trim())
  }

  const handleApiKeyChange = (value: string) => {
    setApiKey(value)
    setConnectedApiKey("")
    setProjects([])
  }

  const isConnected = connectedApiKey.length > 0

  return (
    <div className="grid gap-4 md:grid-cols-2 pt-4">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>{t("labelStudioApiKey")}</CardTitle>
          <CardDescription>{t("labelStudioApiKeyDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleConnect}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="label-studio-api-key">
                {t("labelStudioApiKey")}
              </Label>
              <Input
                id="label-studio-api-key"
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                required
              />
            </div>
            <LoadingButton
              type="submit"
              loading={connectMutation.isPending}
              disabled={!apiKey.trim()}
            >
              {t("connect")}
            </LoadingButton>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("syncImages")}</CardTitle>
          <CardDescription>{t("labelStudioDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LoadingButton
            loading={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
            disabled={!isConnected}
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
                disabled={!isConnected || !projectTitle}
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
