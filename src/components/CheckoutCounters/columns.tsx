import type { ColumnDef } from "@tanstack/react-table"
import { Check, Copy } from "lucide-react"

import type { CheckoutCounterPublic } from "@/client"
import { Button } from "@/components/ui/button"
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard"
import type { TFunction } from "@/i18n"
import { CheckoutCounterActionsMenu } from "./CheckoutCounterActionsMenu"

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

const formatDate = (value?: string | null) => {
  if (!value) {
    return "-"
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export const getCheckoutCounterColumns = (
  t: TFunction,
): ColumnDef<CheckoutCounterPublic>[] => [
  {
    accessorKey: "name",
    header: t("name"),
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "id",
    header: t("id"),
    cell: ({ row }) => <CopyId id={row.original.id} />,
  },
  {
    accessorKey: "created_at",
    header: t("createdAt"),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDate(row.original.created_at)}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">{t("actions")}</span>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <CheckoutCounterActionsMenu counter={row.original} />
      </div>
    ),
  },
]
