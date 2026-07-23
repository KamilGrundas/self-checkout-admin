import { EllipsisVertical } from "lucide-react"
import { useState } from "react"

import type { CheckoutCounterPublic } from "@/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import DeleteCheckoutCounter from "./DeleteCheckoutCounter"
import EditCheckoutCounter from "./EditCheckoutCounter"

interface CheckoutCounterActionsMenuProps {
  counter: CheckoutCounterPublic
}

export const CheckoutCounterActionsMenu = ({
  counter,
}: CheckoutCounterActionsMenuProps) => {
  const [open, setOpen] = useState(false)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <EllipsisVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <EditCheckoutCounter
          counter={counter}
          onSuccess={() => setOpen(false)}
        />
        <DeleteCheckoutCounter
          id={counter.id}
          onSuccess={() => setOpen(false)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
