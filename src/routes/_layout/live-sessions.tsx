import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Radio } from "lucide-react"

import { CheckoutSessionsService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const Route = createFileRoute("/_layout/live-sessions")({
  component: LiveSessions,
  head: () => ({
    meta: [{ title: "Live sessions - Self Checkout Admin" }],
  }),
})

const formatDate = (value?: string | null) => {
  if (!value) return "-"
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value))
}

function LiveSessions() {
  const { data, isLoading } = useQuery({
    queryKey: ["checkout-sessions", "active"],
    queryFn: () => CheckoutSessionsService.readActiveCheckoutSessions(),
    refetchInterval: 3000,
  })

  const sessions = data?.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live sessions</h1>
        <p className="text-muted-foreground">
          Open checkout sessions across all counters.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Radio className="size-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No active sessions</h3>
          <p className="text-muted-foreground">
            Sessions appear here as soon as a kiosk connects.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>Counter</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => {
              const total = s.cart.reduce(
                (acc, item) => acc + Number(item.line_total ?? 0),
                0,
              )
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">
                    {s.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {s.counter_id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {s.client_id.slice(0, 12)}
                  </TableCell>
                  <TableCell>{s.cart.length}</TableCell>
                  <TableCell>{total.toFixed(2)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(s.updated_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="secondary">
                      <Link
                        to="/live-sessions/$sessionId"
                        params={{ sessionId: s.id }}
                      >
                        Take over
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
