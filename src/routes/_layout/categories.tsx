import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Tags } from "lucide-react"
import { Suspense } from "react"

import { CategoriesService } from "@/client"
import AddCategory from "@/components/Categories/AddCategory"
import { getCategoryColumns } from "@/components/Categories/columns"
import { DataTable } from "@/components/Common/DataTable"
import PendingCatalog from "@/components/Pending/PendingCatalog"
import { useI18n } from "@/i18n"

function getCategoriesQueryOptions() {
  return {
    queryFn: () => CategoriesService.readCategories(),
    queryKey: ["categories"],
  }
}

export const Route = createFileRoute("/_layout/categories")({
  component: Categories,
  head: () => ({
    meta: [
      {
        title: "Categories - Self Checkout Admin",
      },
    ],
  }),
})

function CategoriesTableContent() {
  const { data: categories } = useSuspenseQuery(getCategoriesQueryOptions())
  const { t } = useI18n()

  if (categories.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <Tags className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">{t("noCategories")}</h3>
        <p className="text-muted-foreground">{t("noCategoriesDescription")}</p>
      </div>
    )
  }

  return <DataTable columns={getCategoryColumns(t)} data={categories.data} />
}

function CategoriesTable() {
  const { t } = useI18n()

  return (
    <Suspense fallback={<PendingCatalog columns={[t("name"), t("key")]} />}>
      <CategoriesTableContent />
    </Suspense>
  )
}

function Categories() {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("categories")}
          </h1>
          <p className="text-muted-foreground">{t("categoriesDescription")}</p>
        </div>
        <AddCategory />
      </div>
      <CategoriesTable />
    </div>
  )
}
