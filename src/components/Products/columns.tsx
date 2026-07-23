import type { ColumnDef } from "@tanstack/react-table"
import { ImageOff } from "lucide-react"

import type { ProductPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import type { TFunction } from "@/i18n"
import { cn } from "@/lib/utils"
import { ProductActionsMenu } from "./ProductActionsMenu"

function ProductImage({ product }: { product: ProductPublic }) {
  if (!product.image_url) {
    return (
      <div className="flex size-12 items-center justify-center rounded-md border bg-muted text-muted-foreground">
        <ImageOff className="size-5" />
      </div>
    )
  }

  return (
    <img
      src={product.image_url}
      alt={product.name}
      className="size-12 rounded-md border object-cover"
    />
  )
}

const formatPrice = (price: string) => `${Number(price).toFixed(2)} PLN`

export const getProductColumns = (t: TFunction): ColumnDef<ProductPublic>[] => [
  {
    id: "image",
    header: t("image"),
    cell: ({ row }) => <ProductImage product={row.original} />,
  },
  {
    accessorKey: "name",
    header: t("name"),
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "price",
    header: t("price"),
    cell: ({ row }) => (
      <span className="tabular-nums">{formatPrice(row.original.price)}</span>
    ),
  },
  {
    accessorKey: "unit",
    header: t("unit"),
    cell: ({ row }) => <Badge variant="outline">{row.original.unit}</Badge>,
  },
  {
    accessorKey: "category_name",
    header: t("category"),
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span>{row.original.category_name}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.category_key}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "image_url",
    header: t("status"),
    cell: ({ row }) => (
      <span
        className={cn(
          "text-sm",
          row.original.image_url ? "text-green-600" : "text-muted-foreground",
        )}
      >
        {row.original.image_url ? t("imageReady") : t("noImage")}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">{t("actions")}</span>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <ProductActionsMenu product={row.original} />
      </div>
    ),
  },
]
