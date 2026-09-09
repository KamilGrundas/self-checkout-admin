import { UserManager, WebStorageStateStore } from "oidc-client-ts"

export interface AuthConfig {
  mode: "local" | "oidc"
  signup_enabled: boolean
  oidc: { issuer: string; client_id: string; label: string } | null
}

let configPromise: Promise<AuthConfig> | undefined
let manager: UserManager | undefined

export function authConfig(): Promise<AuthConfig> {
  configPromise ??= fetch(`${import.meta.env.VITE_API_URL}/api/v1/login/config`)
    .then((response) => {
      if (!response.ok)
        throw new Error("Authentication configuration unavailable")
      return response.json() as Promise<AuthConfig>
    })
    .catch((error) => {
      configPromise = undefined
      throw error
    })
  return configPromise
}

async function oidcManager(): Promise<UserManager> {
  const config = await authConfig()
  if (config.mode !== "oidc" || !config.oidc) {
    throw new Error("OIDC login is disabled")
  }
  manager ??= new UserManager({
    authority: config.oidc.issuer,
    client_id: config.oidc.client_id,
    redirect_uri: `${window.location.origin}/auth/callback`,
    post_logout_redirect_uri: `${window.location.origin}/login`,
    response_type: "code",
    scope: "openid profile email",
    automaticSilentRenew: false,
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
    loadUserInfo: true,
  })
  return manager
}

export async function startOidcLogin() {
  // oidc-client-ts generates and validates state, nonce and PKCE S256.
  await (await oidcManager()).signinRedirect()
}

export async function finishOidcLogin() {
  const user = await (await oidcManager()).signinRedirectCallback()
  if (!user.access_token) throw new Error("Missing access token")
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/api/v1/users/me`,
    {
      headers: { Authorization: `Bearer ${user.access_token}` },
    },
  )
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    await (await oidcManager()).removeUser()
    throw new Error(
      error.detail?.code === "oidc_email_required"
        ? "oidc_email_required"
        : "Access denied by self-checkout",
    )
  }
  localStorage.removeItem("access_token")
  sessionStorage.setItem("access_token", user.access_token)
}

export function accessToken(): string {
  return (
    sessionStorage.getItem("access_token") ||
    localStorage.getItem("access_token") ||
    ""
  )
}

export function clearAccessToken() {
  sessionStorage.removeItem("access_token")
  localStorage.removeItem("access_token")
}

export async function logout() {
  clearAccessToken()
  if ((await authConfig()).mode === "oidc") {
    const client = await oidcManager()
    try {
      await client.signoutRedirect()
      return
    } finally {
      await client.removeUser()
    }
  }
  window.location.assign("/login")
}
