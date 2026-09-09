import { createFileRoute, Link } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { finishOidcLogin } from "@/auth"
import { AuthLayout } from "@/components/Common/AuthLayout"
import { useI18n } from "@/i18n"

export const Route = createFileRoute("/auth/callback")({ component: Callback })

function Callback() {
  const started = useRef(false)
  const [failed, setFailed] = useState<string | null>(null)
  const { t } = useI18n()
  useEffect(() => {
    if (started.current) return
    started.current = true
    finishOidcLogin()
      .then(() => window.location.replace("/"))
      .catch((error: unknown) => {
        window.history.replaceState({}, "", "/auth/callback")
        setFailed(
          error instanceof Error && error.message === "oidc_email_required"
            ? "ssoEmailRequired"
            : "ssoFailed",
        )
      })
  }, [])
  return (
    <AuthLayout>
      <p role="status">
        {failed
          ? t(failed as "ssoFailed" | "ssoEmailRequired")
          : t("ssoCompleting")}
      </p>
      {failed && <Link to="/login">{t("ssoBackToLogin")}</Link>}
    </AuthLayout>
  )
}
