import axios from "axios"

const backendApi = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api/v1`,
  timeout: 5000,
})

backendApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export interface LabelStudioSettings {
  api_key_configured: boolean
}

export function getLabelStudioSettings() {
  return backendApi
    .get<LabelStudioSettings>("/users/me/label-studio")
    .then((response) => response.data)
}

export function saveLabelStudioApiKey(apiKey: string) {
  return backendApi
    .put<LabelStudioSettings>("/users/me/label-studio", { api_key: apiKey })
    .then((response) => response.data)
}
