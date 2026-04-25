import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { PackageSearch } from "lucide-react"
import { Suspense } from "react"

import { ProductsService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import PendingCatalog from "@/components/Pending/PendingCatalog"
import AddProduct from "@/components/Products/AddProduct"
import { getProductColumns } from "@/components/Products/columns"
import { useI18n } from "@/i18n"

function getProductsQueryOptions() {
  return {
    queryFn: () => ProductsService.readProducts({ skip: 0, limit: 100 }),
    queryKey: ["products"],
  }
}

export const Route = createFileRoute("/_layout/products")({
  component: Products,
  head: () => ({
    meta: [
      {
        title: "Products - Self Checkout Admin",
      },
    ],
  }),
})

function ProductsTableContent() {
  const { data: products } = useSuspenseQuery(getProductsQueryOptions())
  const { t } = useI18n()

  if (products.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <PackageSearch className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">{t("noProducts")}</h3>
        <p className="text-muted-foreground">{t("noProductsDescription")}</p>
      </div>
    )
  }

  return <DataTable columns={getProductColumns(t)} data={products.data} />
}

function ProductsTable() {
  const { t } = useI18n()

  return (
    <Suspense
      fallback={
        <PendingCatalog
          columns={[
            t("image"),
            t("name"),
            t("price"),
            t("unit"),
            t("category"),
          ]}
        />
      }
    >
      <ProductsTableContent />
    </Suspense>
  )
}

function Products() {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("products")}</h1>
          <p className="text-muted-foreground">{t("productsDescription")}</p>
        </div>
        <AddProduct />
      </div>
      <ProductsTable />
    </div>
  )
}
