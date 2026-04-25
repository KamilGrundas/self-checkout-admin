import { Link } from "@tanstack/react-router"

import { Separator } from "@/components/ui/separator"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-auto px-6 py-4 md:px-8">
      <Separator className="mb-4" />
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          Self Checkout Admin - {currentYear}
        </p>
        <div className="flex items-center gap-4">
          <Link
            to="/products"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Products
          </Link>
          <Link
            to="/categories"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Categories
          </Link>
        </div>
      </div>
    </footer>
  )
}
