import { useQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { WifiOff } from "lucide-react"

import { UsersService } from "@/client"
import { DatasetsTab } from "@/components/ML/DatasetsTab"
import { ImagesTab } from "@/components/ML/ImagesTab"
import { LabelStudioTab } from "@/components/ML/LabelStudioTab"
import { ModelsTab } from "@/components/ML/ModelsTab"
import { TrainTab } from "@/components/ML/TrainTab"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useI18n } from "@/i18n"
import mlApi from "@/mlClient"

export const Route = createFileRoute("/_layout/ml")({
  component: ML,
  beforeLoad: async () => {
    const user = await UsersService.readUserMe()
    if (!user.is_superuser) {
      throw redirect({ to: "/" })
    }
  },
  head: () => ({
    meta: [{ title: "Machine Learning - Self Checkout Admin" }],
  }),
})

function MLContent() {
  const { t } = useI18n()
  const { data: health, isError } = useQuery({
    queryKey: ["ml-health"],
    queryFn: () =>
      mlApi.get("/utils/health-check", { timeout: 3000 }).then((r) => r.data),
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
    <Tabs defaultValue="models">
      <TabsList>
        <TabsTrigger value="models">{t("models")}</TabsTrigger>
        <TabsTrigger value="label-studio">{t("labelStudio")}</TabsTrigger>
        <TabsTrigger value="datasets">{t("datasets")}</TabsTrigger>
        <TabsTrigger value="train">{t("train")}</TabsTrigger>
        <TabsTrigger value="images">{t("images")}</TabsTrigger>
      </TabsList>
      <TabsContent value="models">
        <ModelsTab />
      </TabsContent>
      <TabsContent value="label-studio">
        <LabelStudioTab />
      </TabsContent>
      <TabsContent value="datasets">
        <DatasetsTab />
      </TabsContent>
      <TabsContent value="train">
        <TrainTab />
      </TabsContent>
      <TabsContent value="images">
        <ImagesTab />
      </TabsContent>
    </Tabs>
  )
}

function ML() {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("ml")}</h1>
        <p className="text-muted-foreground">{t("mlDescription")}</p>
      </div>
      <MLContent />
    </div>
  )
}
