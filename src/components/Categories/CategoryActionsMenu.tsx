import { EllipsisVertical, LockKeyhole } from "lucide-react"
import { useState } from "react"

import type { CategoryPublic } from "@/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useI18n } from "@/i18n"
import DeleteCategory from "./DeleteCategory"
import EditCategory from "./EditCategory"

interface CategoryActionsMenuProps {
  category: CategoryPublic
}

export const CategoryActionsMenu = ({ category }: CategoryActionsMenuProps) => {
  const [open, setOpen] = useState(false)
  const { t } = useI18n()
  const isDefault = category.key === "other"

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isDefault ? (
          <DropdownMenuItem disabled>
            <LockKeyhole />
            {t("defaultCategoryLocked")}
          </DropdownMenuItem>
        ) : (
          <>
            <EditCategory
              category={category}
              onSuccess={() => setOpen(false)}
            />
            <DeleteCategory id={category.id} onSuccess={() => setOpen(false)} />
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
