export interface RegistrationConfig {
  signup_enabled: boolean
}

let registrationConfigPromise: Promise<RegistrationConfig> | undefined

export function registrationConfig(): Promise<RegistrationConfig> {
  registrationConfigPromise ??= fetch(
    `${import.meta.env.VITE_API_URL}/api/v1/login/registration-config`,
  )
    .then((response) => {
      if (!response.ok)
        throw new Error("Registration configuration unavailable")
      return response.json() as Promise<RegistrationConfig>
    })
    .catch((error) => {
      registrationConfigPromise = undefined
      throw error
    })
  return registrationConfigPromise
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

export function logout() {
  clearAccessToken()
  window.location.assign("/login")
}
