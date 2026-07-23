import axios, { type AxiosError } from "axios"

const mlApi = axios.create({
  baseURL: `${import.meta.env.VITE_ML_API_URL ?? "http://localhost:8001"}/api/v1`,
  timeout: 5000,
})

mlApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default mlApi

export function mlErrorMessage(err: unknown): string {
  const axiosErr = err as AxiosError<{ detail?: string }>
  return (
    axiosErr.response?.data?.detail ??
    axiosErr.message ??
    "Something went wrong"
  )
}
