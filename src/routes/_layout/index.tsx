import { createFileRoute, Link } from "@tanstack/react-router"
import { Package, Tags } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import useAuth from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
  head: () => ({
    meta: [
      {
        title: "Dashboard - Self Checkout Admin",
      },
    ],
  }),
})

function Dashboard() {
  const { user: currentUser } = useAuth()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="max-w-sm truncate text-2xl font-bold tracking-tight">
          Catalog dashboard
        </h1>
        <p className="text-muted-foreground">
          Signed in as {currentUser?.full_name || currentUser?.email}.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/products">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="size-5" />
                Products
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Manage product names, prices, units, categories and images.
            </CardContent>
          </Card>
        </Link>
        <Link to="/categories">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tags className="size-5" />
                Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Maintain catalog groups used by products and the kiosk client.
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
