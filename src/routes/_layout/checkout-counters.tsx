import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { MonitorCog } from "lucide-react"
import { Suspense } from "react"

import { CheckoutCountersService } from "@/client"
import AddCheckoutCounter from "@/components/CheckoutCounters/AddCheckoutCounter"
import { getCheckoutCounterColumns } from "@/components/CheckoutCounters/columns"
import { DataTable } from "@/components/Common/DataTable"
import PendingCatalog from "@/components/Pending/PendingCatalog"
import { useI18n } from "@/i18n"

function getCheckoutCountersQueryOptions() {
  return {
    queryFn: () =>
      CheckoutCountersService.checkoutCountersReadCheckoutCounters(),
    queryKey: ["checkout-counters"],
    refetchInterval: 5000,
  }
}

export const Route = createFileRoute("/_layout/checkout-counters")({
  component: CheckoutCounters,
  head: () => ({
    meta: [
      {
        title: "Checkout counters - Self Checkout Admin",
      },
    ],
  }),
})

function CheckoutCountersTableContent() {
  const { data: counters } = useSuspenseQuery(getCheckoutCountersQueryOptions())
  const { t } = useI18n()

  if (counters.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          <MonitorCog className="size-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">{t("noCounters")}</h3>
        <p className="text-muted-foreground">{t("noCountersDescription")}</p>
      </div>
    )
  }

  return (
    <DataTable columns={getCheckoutCounterColumns(t)} data={counters.data} />
  )
}

function CheckoutCountersTable() {
  const { t } = useI18n()

  return (
    <Suspense
      fallback={
        <PendingCatalog columns={[t("name"), t("id"), t("createdAt")]} />
      }
    >
      <CheckoutCountersTableContent />
    </Suspense>
  )
}

function CheckoutCounters() {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("checkoutCounters")}
          </h1>
          <p className="text-muted-foreground">
            {t("checkoutCountersDescription")}
          </p>
        </div>
        <AddCheckoutCounter />
      </div>
      <CheckoutCountersTable />
    </div>
  )
}
