import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Tags } from "lucide-react"
import { Suspense } from "react"

import { CategoriesService } from "@/client"
import AddCategory from "@/components/Categories/AddCategory"
import { columns } from "@/components/Categories/columns"
import { DataTable } from "@/components/Common/DataTable"
import PendingCatalog from "@/components/Pending/PendingCatalog"

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

  if (categories.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <Tags className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No categories yet</h3>
        <p className="text-muted-foreground">
          Add a category before organizing products.
        </p>
      </div>
    )
  }

  return <DataTable columns={columns} data={categories.data} />
}

function CategoriesTable() {
  return (
    <Suspense fallback={<PendingCatalog columns={["Name", "Key", "ID"]} />}>
      <CategoriesTableContent />
    </Suspense>
  )
}

function Categories() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Manage product groups used by the checkout catalog.
          </p>
        </div>
        <AddCategory />
      </div>
      <CategoriesTable />
    </div>
  )
}
