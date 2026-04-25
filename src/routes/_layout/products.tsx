import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { PackageSearch } from "lucide-react"
import { Suspense } from "react"

import { ProductsService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import PendingCatalog from "@/components/Pending/PendingCatalog"
import AddProduct from "@/components/Products/AddProduct"
import { columns } from "@/components/Products/columns"

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

  if (products.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <PackageSearch className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No products yet</h3>
        <p className="text-muted-foreground">
          Add the first product to start building the catalog.
        </p>
      </div>
    )
  }

  return <DataTable columns={columns} data={products.data} />
}

function ProductsTable() {
  return (
    <Suspense
      fallback={
        <PendingCatalog
          columns={["Image", "Name", "Price", "Unit", "Category", "ID"]}
        />
      }
    >
      <ProductsTableContent />
    </Suspense>
  )
}

function Products() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground">
            Manage prices, units, images and product categories.
          </p>
        </div>
        <AddProduct />
      </div>
      <ProductsTable />
    </div>
  )
}
