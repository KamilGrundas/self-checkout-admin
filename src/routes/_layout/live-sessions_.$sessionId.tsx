import { useQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
  type CheckoutSessionCartItem,
  type CheckoutSessionPublic,
  type ProductPublic,
  ProductsService,
} from "@/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const Route = createFileRoute("/_layout/live-sessions_/$sessionId")({
  component: LiveSessionDetail,
  head: () => ({
    meta: [{ title: "Live session - Self Checkout Admin" }],
  }),
})

type ConnectionStatus = "connecting" | "open" | "closed"

function buildWsUrl(sessionId: string, token: string) {
  const base = (import.meta.env.VITE_API_URL as string) || ""
  const trimmed = base.replace(/\/$/, "")
  let scheme = trimmed
  if (trimmed.startsWith("https://")) {
    scheme = `wss://${trimmed.slice("https://".length)}`
  } else if (trimmed.startsWith("http://")) {
    scheme = `ws://${trimmed.slice("http://".length)}`
  } else if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:"
    scheme = `${proto}//${window.location.host}`
  }
  const apiV1 = scheme.endsWith("/api/v1") ? scheme : `${scheme}/api/v1`
  return `${apiV1}/ws/admin/sessions/${sessionId}?token=${encodeURIComponent(token)}`
}

type EditTarget = { index: number; item: CheckoutSessionCartItem }
type ConfirmTarget =
  | { kind: "remove"; index: number; item: CheckoutSessionCartItem }
  | { kind: "cancel" }

function LiveSessionDetail() {
  const { sessionId } = Route.useParams()
  const [status, setStatus] = useState<ConnectionStatus>("connecting")
  const [session, setSession] = useState<CheckoutSessionPublic | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      setError("Not authenticated")
      setStatus("closed")
      return
    }
    const url = buildWsUrl(sessionId, token)
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setStatus("open")
    ws.onclose = () => setStatus("closed")
    ws.onerror = () => setError("WebSocket error")
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "session_state" && data.session) {
          setSession(data.session as CheckoutSessionPublic)
        }
      } catch {
        // ignore non-JSON / unexpected messages
      }
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [sessionId])

  const send = useCallback((payload: unknown) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload))
    }
  }, [])

  const removeItem = (index: number) =>
    send({ command: "remove_item", index })
  const updateItemQuantity = (index: number, quantity: number) =>
    send({ command: "update_item_quantity", index, quantity })
  const addItem = (productId: string, quantity: number) =>
    send({ command: "add_item", product_id: productId, quantity })
  const cancelSession = () => send({ command: "cancel_session" })

  const confirmAction = () => {
    if (!confirmTarget) return
    if (confirmTarget.kind === "remove") {
      removeItem(confirmTarget.index)
    } else {
      cancelSession()
    }
    setConfirmTarget(null)
  }

  const total = useMemo(
    () =>
      (session?.cart ?? []).reduce(
        (acc, item) => acc + Number(item.line_total ?? 0),
        0,
      ),
    [session],
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/live-sessions">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Session {sessionId.slice(0, 8)}
            </h1>
            <p className="text-muted-foreground font-mono text-xs">
              {sessionId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              status === "open"
                ? "default"
                : status === "connecting"
                  ? "secondary"
                  : "destructive"
            }
          >
            {status}
          </Badge>
          <Button
            variant="destructive"
            size="sm"
            disabled={status !== "open" || !!session?.closed}
            onClick={() => setConfirmTarget({ kind: "cancel" })}
          >
            Cancel session
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!session ? (
        <p className="text-muted-foreground">Waiting for session state...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Counter" value={session.counter_id.slice(0, 8)} />
            <Stat label="Client" value={session.client_id.slice(0, 12)} />
            <Stat label="Items" value={String(session.cart.length)} />
            <Stat label="Total" value={total.toFixed(2)} />
          </div>

          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={status !== "open" || !!session.closed}
              onClick={() => setAddOpen(true)}
            >
              <Plus className="size-4" />
              Add product
            </Button>
          </div>

          {session.cart.length === 0 ? (
            <p className="text-muted-foreground">Cart is empty.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Line total</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {session.cart.map((item, index) => (
                  <TableRow key={`${item.product_id}-${index}`}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.quantity_label}</TableCell>
                    <TableCell>{Number(item.price).toFixed(2)}</TableCell>
                    <TableCell>{Number(item.line_total).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={status !== "open" || !!session.closed}
                          onClick={() => setEditTarget({ index, item })}
                        >
                          <Pencil className="size-4" />
                          <span className="sr-only">Edit quantity</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={status !== "open" || !!session.closed}
                          onClick={() =>
                            setConfirmTarget({ kind: "remove", index, item })
                          }
                        >
                          <Trash2 className="size-4" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}

      <AddProductDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={(productId, quantity) => {
          addItem(productId, quantity)
          setAddOpen(false)
        }}
      />

      <EditQuantityDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={(quantity) => {
          if (editTarget) updateItemQuantity(editTarget.index, quantity)
          setEditTarget(null)
        }}
      />

      <ConfirmDialog
        target={confirmTarget}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={confirmAction}
      />
    </div>
  )
}

function AddProductDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (productId: string, quantity: number) => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["products", "all-for-admin-cart"],
    queryFn: () => ProductsService.readProducts({ limit: 500 }),
    enabled: open,
  })
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<ProductPublic | null>(null)
  const [quantity, setQuantity] = useState("1")

  useEffect(() => {
    if (!open) {
      setSearch("")
      setSelected(null)
      setQuantity("1")
    }
  }, [open])

  useEffect(() => {
    if (selected) {
      setQuantity(selected.unit === "kg" ? "1.00" : "1")
    }
  }, [selected])

  const products = data?.data ?? []
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, search])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    const parsed = Number(quantity)
    if (!Number.isFinite(parsed) || parsed <= 0) return
    onSubmit(selected.id, selected.unit === "kg" ? parsed : Math.floor(parsed))
  }

  const isKg = selected?.unit === "kg"

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add product</DialogTitle>
            <DialogDescription>
              Add a product to the customer's cart.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="max-h-64 overflow-y-auto rounded-md border">
              {isLoading ? (
                <p className="p-3 text-sm text-muted-foreground">Loading...</p>
              ) : filtered.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">
                  No products found.
                </p>
              ) : (
                <ul className="divide-y">
                  {filtered.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(p)}
                        className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted ${
                          selected?.id === p.id ? "bg-muted" : ""
                        }`}
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {Number(p.price).toFixed(2)} / {p.unit}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {selected && (
              <div className="grid gap-2">
                <Label htmlFor="add-qty">
                  Quantity ({isKg ? "kg" : "szt"}) — {selected.name}
                </Label>
                <Input
                  id="add-qty"
                  type="number"
                  step={isKg ? "0.01" : "1"}
                  min={isKg ? "0.01" : "1"}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selected}>
              Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditQuantityDialog({
  target,
  onClose,
  onSubmit,
}: {
  target: EditTarget | null
  onClose: () => void
  onSubmit: (quantity: number) => void
}) {
  const [value, setValue] = useState("")

  useEffect(() => {
    if (target) setValue(String(target.item.quantity))
  }, [target])

  if (!target) return null

  const isKg = target.item.unit === "kg"
  const step = isKg ? "0.01" : "1"
  const min = isKg ? "0.01" : "1"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) return
    onSubmit(isKg ? parsed : Math.floor(parsed))
  }

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit quantity</DialogTitle>
            <DialogDescription>{target.item.name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-4">
            <Label htmlFor="qty">
              Quantity ({isKg ? "kg" : "szt"})
            </Label>
            <Input
              id="qty"
              type="number"
              step={step}
              min={min}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ConfirmDialog({
  target,
  onCancel,
  onConfirm,
}: {
  target: ConfirmTarget | null
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!target) return null

  const title = target.kind === "remove" ? "Remove item?" : "Cancel session?"
  const description =
    target.kind === "remove"
      ? `Remove "${target.item.name}" from the cart? The customer will see the change immediately.`
      : "This will close the checkout session without payment. The customer's cart will be cleared."

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {target.kind === "remove" ? "Remove" : "Cancel session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm">{value}</p>
    </div>
  )
}
