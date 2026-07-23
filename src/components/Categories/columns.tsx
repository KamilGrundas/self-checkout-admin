import type { ColumnDef } from "@tanstack/react-table"

import type { CategoryPublic } from "@/client"
import { Badge } from "@/components/ui/badge"
import type { TFunction } from "@/i18n"
import { CategoryActionsMenu } from "./CategoryActionsMenu"

export const getCategoryColumns = (
  t: TFunction,
): ColumnDef<CategoryPublic>[] => [
  {
    accessorKey: "name",
    header: t("name"),
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{row.original.name}</span>
        {row.original.key === "other" && (
          <Badge variant="secondary">{t("defaultCategory")}</Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: "key",
    header: t("key"),
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.key}
      </span>
    ),
  },
  {
    id: "actions",
    header: () => <span className="sr-only">{t("actions")}</span>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <CategoryActionsMenu category={row.original} />
      </div>
    ),
  },
]
