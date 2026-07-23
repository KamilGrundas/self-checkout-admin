import { Link } from "@tanstack/react-router"
import { ShoppingBasket } from "lucide-react"

import { cn } from "@/lib/utils"

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

export function Logo({
  variant = "full",
  className,
  asLink = true,
}: LogoProps) {
  const icon = (
    <span
      className={cn(
        "flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground",
        variant === "icon" && "size-9",
        className,
      )}
    >
      <ShoppingBasket className="size-5" />
    </span>
  )

  const content =
    variant === "icon" ? (
      icon
    ) : (
      <div className="flex items-center gap-2">
        {icon}
        <span
          className={cn(
            "font-semibold tracking-tight group-data-[collapsible=icon]:hidden",
            variant === "responsive" ? "text-base" : "text-lg",
          )}
        >
          Self Checkout Admin
        </span>
      </div>
    )

  if (!asLink) {
    return content
  }

  return <Link to="/">{content}</Link>
}
