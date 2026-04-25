import type { ColumnDef } from "@tanstack/react-table"
import { Check, Copy, ImageOff } from "lucide-react"

import type { ProductPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard"
import { cn } from "@/lib/utils"
import { ProductActionsMenu } from "./ProductActionsMenu"

function CopyId({ id }: { id: string }) {
  const [copiedText, copy] = useCopyToClipboard()
  const isCopied = copiedText === id

  return (
    <div className="flex items-center gap-1.5 group">
      <span className="font-mono text-xs text-muted-foreground">{id}</span>
      <Button
        variant="ghost"
        size="icon"
        className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => copy(id)}
      >
        {isCopied ? (
          <Check className="size-3 text-green-500" />
        ) : (
          <Copy className="size-3" />
        )}
        <span className="sr-only">Copy ID</span>
      </Button>
    </div>
  )
}

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

export const columns: ColumnDef<ProductPublic>[] = [
  {
    id: "image",
    header: "Image",
    cell: ({ row }) => <ProductImage product={row.original} />,
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "price",
    header: "Price",
    cell: ({ row }) => (
      <span className="tabular-nums">{formatPrice(row.original.price)}</span>
    ),
  },
  {
    accessorKey: "unit",
    header: "Unit",
    cell: ({ row }) => <Badge variant="outline">{row.original.unit}</Badge>,
  },
  {
    accessorKey: "category_name",
    header: "Category",
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
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => <CopyId id={row.original.id} />,
  },
  {
    accessorKey: "image_url",
    header: "Status",
    cell: ({ row }) => (
      <span
        className={cn(
          "text-sm",
          row.original.image_url ? "text-green-600" : "text-muted-foreground",
        )}
      >
        {row.original.image_url ? "Image ready" : "No image"}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <ProductActionsMenu product={row.original} />
      </div>
    ),
  },
]
