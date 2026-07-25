import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { KeyRound } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import {
  getLabelStudioSettings,
  saveLabelStudioApiKey,
} from "@/labelStudioSettingsClient"
import mlApi, { mlErrorMessage } from "@/mlClient"

interface LabelStudioProject {
  id: number
  title: string
}

function useProjects(enabled: boolean) {
  return useQuery({
    queryKey: ["ls-projects"],
    queryFn: () =>
      mlApi
        .get<LabelStudioProject[]>("/label-studio/projects")
        .then((r) => r.data),
    enabled,
    retry: false,
  })
}

export function LabelStudioTab() {
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const [apiKey, setApiKey] = useState("")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [projectTitle, setProjectTitle] = useState("")
  const [releaseName, setReleaseName] = useState("")

  const { data: settings } = useQuery({
    queryKey: ["label-studio-settings"],
    queryFn: getLabelStudioSettings,
  })
  const apiKeyConfigured = settings?.api_key_configured ?? false
  const { data: projects = [] } = useProjects(apiKeyConfigured)

  const saveApiKeyMutation = useMutation({
    mutationFn: saveLabelStudioApiKey,
    onSuccess: async () => {
      setApiKey("")
      setSettingsOpen(false)
      await queryClient.invalidateQueries({
        queryKey: ["label-studio-settings"],
      })
      await queryClient.invalidateQueries({ queryKey: ["ls-projects"] })
      toast.success(t("labelStudioApiKeySaved"))
    },
    onError: (err) =>
      toast.error("Error", { description: mlErrorMessage(err) }),
  })

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

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault()
    saveApiKeyMutation.mutate(apiKey.trim())
  }

  const handleSettingsOpenChange = (open: boolean) => {
    setSettingsOpen(open)
    if (!open) setApiKey("")
  }

  return (
    <div className="pt-4">
      <div className="mb-4 flex justify-end">
        <Dialog open={settingsOpen} onOpenChange={handleSettingsOpenChange}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <KeyRound className="size-4" />
              {apiKeyConfigured
                ? t("updateLabelStudioApiKey")
                : t("addLabelStudioApiKey")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {apiKeyConfigured
                  ? t("updateLabelStudioApiKey")
                  : t("addLabelStudioApiKey")}
              </DialogTitle>
              <DialogDescription>
                {t("labelStudioApiKeyDescription")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveApiKey}>
              <div className="grid gap-2 py-4">
                <Label htmlFor="label-studio-api-key">
                  {t("labelStudioApiKey")}
                </Label>
                <Input
                  id="label-studio-api-key"
                  type="password"
                  autoComplete="new-password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saveApiKeyMutation.isPending}
                  >
                    {t("cancel")}
                  </Button>
                </DialogClose>
                <LoadingButton
                  type="submit"
                  loading={saveApiKeyMutation.isPending}
                  disabled={!apiKey.trim()}
                >
                  {t("save")}
                </LoadingButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("syncImages")}</CardTitle>
            <CardDescription>{t("labelStudioDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <LoadingButton
              loading={syncMutation.isPending}
              onClick={() => syncMutation.mutate()}
              disabled={!apiKeyConfigured}
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
                  disabled={!apiKeyConfigured || !projectTitle}
                >
                  {t("exportDataset")}
                </LoadingButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
