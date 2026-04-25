import { createFileRoute, Link } from "@tanstack/react-router"
import { MonitorCog, Package, Tags } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import useAuth from "@/hooks/useAuth"
import { useI18n } from "@/i18n"

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
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="max-w-sm truncate text-2xl font-bold tracking-tight">
          {t("catalogDashboard")}
        </h1>
        <p className="text-muted-foreground">
          {t("signedInAs")} {currentUser?.full_name || currentUser?.email}.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/products">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="size-5" />
                {t("products")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {t("productCatalogDescription")}
            </CardContent>
          </Card>
        </Link>
        <Link to="/categories">
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tags className="size-5" />
                {t("categories")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {t("productGroupsDescription")}
            </CardContent>
          </Card>
        </Link>
        {currentUser?.is_superuser && (
          <Link to="/checkout-counters">
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MonitorCog className="size-5" />
                  {t("checkoutCounters")}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t("checkoutCountersDescription")}
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
    </div>
  )
}
