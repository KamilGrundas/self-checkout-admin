import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"
import { accessToken } from "@/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import useAuth from "@/hooks/useAuth"
import { useI18n } from "@/i18n"

export const Route = createFileRoute("/_layout/api-keys")({
  component: ApiKeys,
})

interface KeyInfo {
  id: string
  name: string
  prefix: string
  scopes: string[]
  role: "user" | "admin" | null
  expires_at: string | null
  revoked: boolean
}

async function api<T>(path = "", init?: RequestInit): Promise<T> {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/api/v1/api-keys/${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken()}`,
        "Content-Type": "application/json",
      },
    },
  )
  if (!response.ok) throw new Error("API key operation failed")
  return response.json()
}

function ApiKeys() {
  const { user } = useAuth()
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [name, setName] = useState("")
  const [role, setRole] = useState<"user" | "admin">("user")
  const [days, setDays] = useState("")
  const [created, setCreated] = useState<string | null>(null)
  const keys = useQuery({
    queryKey: ["apiKeys"],
    queryFn: () => api<KeyInfo[]>(),
    enabled: !!user?.is_superuser,
  })
  const create = useMutation({
    mutationFn: () =>
      api<KeyInfo & { key: string }>("", {
        method: "POST",
        body: JSON.stringify({
          name,
          role,
          expires_in_days: days === "" ? null : Number(days),
        }),
      }),
    onSuccess: (result) => {
      setCreated(result.key)
      void queryClient.invalidateQueries({ queryKey: ["apiKeys"] })
    },
  })
  const revoke = useMutation({
    mutationFn: (id: string) => api(id, { method: "DELETE" }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["apiKeys"] }),
  })
  if (!user?.is_superuser) return <p>{t("apiKeysAdminOnly")}</p>
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("apiKeys")}</h1>
      <p>{t("apiKeysDescription")}</p>
      <h2 className="text-xl font-semibold">{t("apiKeysSelfCheckout")}</h2>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          create.mutate()
        }}
      >
        <label className="block" htmlFor="api-key-name">
          {t("apiKeyName")}
          <Input
            id="api-key-name"
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="block" htmlFor="api-key-days">
          {t("apiKeyDays")}
          <Input
            id="api-key-days"
            type="number"
            min={1}
            max={365}
            placeholder={t("apiKeyUnlimitedHint")}
            value={days}
            onChange={(event) => setDays(event.target.value)}
          />
        </label>
        <fieldset className="space-y-2">
          <legend>{t("apiKeyRole")}</legend>
          {(["user", "admin"] as const).map((value) => (
            <label key={value} className="block">
              <input
                type="radio"
                name="api-key-role"
                value={value}
                checked={role === value}
                onChange={() => setRole(value)}
              />{" "}
              {t(value === "admin" ? "apiKeyAdminRole" : "apiKeyUserRole")}
            </label>
          ))}
        </fieldset>
        <Button disabled={create.isPending || created !== null}>
          {t("apiKeyCreate")}
        </Button>
      </form>
      {created && (
        <div role="status" className="space-y-2">
          <p>{t("apiKeyOnce")}</p>
          <Button
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([`${created}\n`], { type: "text/plain" }),
              )
              const link = document.createElement("a")
              link.href = url
              link.download = "self-checkout-api.token"
              link.click()
              setTimeout(() => URL.revokeObjectURL(url), 1000)
            }}
          >
            {t("apiKeyDownload")}
          </Button>
          <Button variant="outline" onClick={() => setCreated(null)}>
            {t("apiKeySaved")}
          </Button>
        </div>
      )}
      {(keys.isError || create.isError || revoke.isError) && (
        <p role="alert">{t("apiKeyError")}</p>
      )}
      <ul className="space-y-3">
        {keys.data?.map((key) => (
          <li key={key.id} className="flex flex-wrap items-center gap-3">
            <span>
              {key.name} · {key.prefix}… ·{" "}
              {key.role
                ? t(key.role === "admin" ? "apiKeyAdminRole" : "apiKeyUserRole")
                : key.scopes.join(", ")}{" "}
              ·{" "}
              {key.expires_at
                ? new Date(key.expires_at).toLocaleDateString()
                : t("apiKeyNoExpiry")}
            </span>
            {key.revoked ? (
              <span>{t("apiKeyRevoked")}</span>
            ) : (
              <Button
                variant="outline"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(key.id)}
              >
                {t("apiKeyRevoke")}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
