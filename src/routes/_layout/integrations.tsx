import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Circle, EllipsisVertical, Pencil, Plus } from "lucide-react"
import { useState } from "react"

import { accessToken } from "@/auth"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useI18n } from "@/i18n"

export const Route = createFileRoute("/_layout/integrations")({
  component: Integrations,
})

type VisionIntegration = {
  id: string
  name: string
  endpoint_url: string
  api_key_configured: boolean
  active: boolean
  configured: boolean
  model_name: string | null
  active_model: string | null
  model_loaded: boolean
  read_timeout_seconds: number
}

type AvailableModels = {
  models: Array<{ id: string; loaded: boolean; is_vision: boolean | null }>
  active_model: string | null
}

async function integrationsApi<T>(path = "", init?: RequestInit): Promise<T> {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/api/v1/vision-inference-integrations/${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken()}`,
        "Content-Type": "application/json",
      },
    },
  )
  if (!response.ok)
    throw new Error("Vision inference integration operation failed")
  return response.json()
}

function Integrations() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [name, setName] = useState("")
  const [endpoint, setEndpoint] = useState("")
  const [apiKey, setApiKey] = useState("")
  const integrations = useQuery({
    queryKey: ["vision-inference-integrations"],
    queryFn: () => integrationsApi<VisionIntegration[]>(),
  })
  const create = useMutation({
    mutationFn: () =>
      integrationsApi<VisionIntegration>("", {
        method: "POST",
        body: JSON.stringify({ name, endpoint_url: endpoint, api_key: apiKey }),
      }),
    onSuccess: () => {
      setName("")
      setEndpoint("")
      setApiKey("")
      void queryClient.invalidateQueries({
        queryKey: ["vision-inference-integrations"],
      })
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("integrations")}</h1>
        <p className="text-muted-foreground">{t("integrationsDescription")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("addVisionIntegration")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault()
              create.mutate()
            }}
          >
            <label className="flex flex-col gap-2" htmlFor="integration-name">
              <Label>{t("integrationName")}</Label>
              <Input
                id="integration-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label
              className="flex flex-col gap-2"
              htmlFor="integration-endpoint"
            >
              <Label>{t("inferenceEndpoint")}</Label>
              <Input
                id="integration-endpoint"
                required
                type="url"
                placeholder="https://vision_inference.com/v1/chat/completions"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
              />
            </label>
            <label
              className="flex flex-col gap-2"
              htmlFor="integration-api-key"
            >
              <Label>{t("autolabelApiKey")}</Label>
              <Input
                id="integration-api-key"
                required
                type="password"
                autoComplete="new-password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </label>
            <div className="md:col-span-3">
              <Button disabled={create.isPending}>
                <Plus className="size-4" />
                {t("addIntegration")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      {integrations.isError || create.isError ? (
        <p role="alert">{t("integrationError")}</p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {integrations.data?.map((integration) => (
          <IntegrationCard key={integration.id} integration={integration} />
        ))}
      </div>
      {integrations.data?.length === 0 ? (
        <p className="text-muted-foreground">{t("noIntegrations")}</p>
      ) : null}
    </div>
  )
}

function IntegrationCard({ integration }: { integration: VisionIntegration }) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const models = useQuery({
    queryKey: ["vision-inference-models", integration.id],
    queryFn: () => integrationsApi<AvailableModels>(`${integration.id}/models`),
    enabled: integration.api_key_configured,
    retry: false,
  })
  const update = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      integrationsApi<VisionIntegration>(integration.id, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["vision-inference-integrations"],
      }),
  })
  const activate = useMutation({
    mutationFn: () =>
      integrationsApi<VisionIntegration>(`${integration.id}/activate`, {
        method: "POST",
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ["vision-inference-integrations"],
      }),
  })
  const loaded = integration.model_loaded

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle>{integration.name}</CardTitle>
          <div className="flex items-center gap-3">
            <span
              className="flex items-center gap-2 text-sm"
              title={loaded ? t("modelDetected") : t("modelNotDetected")}
            >
              <Circle
                className={
                  loaded
                    ? "size-3 fill-green-500 text-green-500"
                    : "size-3 fill-red-500 text-red-500"
                }
              />
              {loaded ? t("modelDetected") : t("modelNotDetected")}
            </span>
            <IntegrationActions integration={integration} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="break-all text-sm text-muted-foreground">
          {integration.endpoint_url}
        </p>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              integration.api_key_configured ? "secondary" : "destructive"
            }
          >
            {integration.api_key_configured
              ? t("apiKeyConfigured")
              : t("autolabelKeyEmpty")}
          </Badge>
          {integration.active ? (
            <Badge>{t("integrationActive")}</Badge>
          ) : (
            <Button
              variant="outline"
              disabled={!integration.configured || activate.isPending}
              onClick={() => activate.mutate()}
            >
              {t("activateIntegration")}
            </Button>
          )}
        </div>
        <label
          className="flex flex-col gap-2"
          htmlFor={`integration-model-${integration.id}`}
        >
          <Label>{t("autolabelModel")}</Label>
          <select
            id={`integration-model-${integration.id}`}
            className="h-10 rounded-md border bg-background px-3"
            disabled={models.isLoading || !integration.api_key_configured}
            value={integration.model_name ?? ""}
            onChange={(event) =>
              update.mutate({ model_name: event.target.value })
            }
          >
            <option value="">{t("autolabelSelectModel")}</option>
            {models.data?.models.map((model) => (
              <option
                key={model.id}
                value={model.id}
                disabled={model.is_vision === false}
              >
                {model.id}
                {model.loaded ? ` (${t("autolabelLoadedModel")})` : ""}
              </option>
            ))}
          </select>
        </label>
        {models.isError || update.isError || activate.isError ? (
          <p role="alert">{t("integrationError")}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function IntegrationActions({
  integration,
}: {
  integration: VisionIntegration
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [readTimeout, setReadTimeout] = useState(
    integration.read_timeout_seconds,
  )
  const openEditor = () => {
    setReadTimeout(integration.read_timeout_seconds)
    setOpen(true)
  }
  const update = useMutation({
    mutationFn: () =>
      integrationsApi<VisionIntegration>(integration.id, {
        method: "PATCH",
        body: JSON.stringify({ read_timeout_seconds: readTimeout }),
      }),
    onSuccess: () => {
      setOpen(false)
      void queryClient.invalidateQueries({
        queryKey: ["vision-inference-integrations"],
      })
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t("actions")}>
            <EllipsisVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={openEditor}>
            <Pencil />
            {t("editIntegration")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editIntegration")}</DialogTitle>
          <DialogDescription>{integration.name}</DialogDescription>
        </DialogHeader>
        <label
          className="flex flex-col gap-2"
          htmlFor={`read-timeout-${integration.id}`}
        >
          <Label>{t("readTimeout")}</Label>
          <Input
            id={`read-timeout-${integration.id}`}
            type="number"
            min={1}
            max={6000}
            value={readTimeout}
            onChange={(event) => setReadTimeout(Number(event.target.value))}
          />
        </label>
        {update.isError ? <p role="alert">{t("integrationError")}</p> : null}
        <DialogFooter>
          <Button
            disabled={update.isPending || readTimeout < 1 || readTimeout > 6000}
            onClick={() => update.mutate()}
          >
            {t("saveConfiguration")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
