import { useQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { WifiOff } from "lucide-react"

import { UsersService } from "@/client"
import { DatasetsTab } from "@/components/ML/DatasetsTab"
import { LabelTab } from "@/components/ML/ImagesTab"
import { LabeledImagesTab } from "@/components/ML/LabeledImagesTab"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useI18n } from "@/i18n"
import mlApi from "@/mlClient"

export const Route = createFileRoute("/_layout/label")({
  component: Label,
  beforeLoad: async () => {
    const user = await UsersService.readUserMe()
    if (!user.is_superuser) {
      throw redirect({ to: "/" })
    }
  },
  head: () => ({
    meta: [{ title: "Label - Self Checkout Admin" }],
  }),
})

function LabelContent() {
  const { t } = useI18n()
  const { data: health, isError } = useQuery({
    queryKey: ["ml-health"],
    queryFn: () =>
      mlApi.get("/utils/health-check/", { timeout: 3000 }).then((r) => r.data),
    retry: false,
    refetchOnWindowFocus: false,
  })

  if (!health && !isError) {
    return (
      <p className="text-sm text-muted-foreground">Checking ML service...</p>
    )
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <WifiOff className="size-4" />
        <AlertTitle>ML Service</AlertTitle>
        <AlertDescription>{t("mlServiceOffline")}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Tabs defaultValue="label">
      <TabsList>
        <TabsTrigger value="label">{t("label")}</TabsTrigger>
        <TabsTrigger value="images">{t("images")}</TabsTrigger>
        <TabsTrigger value="datasets">{t("datasets")}</TabsTrigger>
      </TabsList>
      <TabsContent value="label">
        <LabelTab />
      </TabsContent>
      <TabsContent value="images">
        <LabeledImagesTab />
      </TabsContent>
      <TabsContent value="datasets">
        <DatasetsTab />
      </TabsContent>
    </Tabs>
  )
}

function Label() {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("label")}</h1>
      </div>
      <LabelContent />
    </div>
  )
}
