import { AxiosError } from "axios"
import { ApiClientError } from "./apiError"

function extractErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    return err.message
  }

  const body = err instanceof ApiClientError ? err.body : err
  const errDetail =
    typeof body === "object" && body !== null && "detail" in body
      ? body.detail
      : undefined
  if (Array.isArray(errDetail) && errDetail.length > 0) {
    const first = errDetail[0]
    return typeof first === "object" && first !== null && "msg" in first
      ? String(first.msg)
      : String(first)
  }
  return typeof errDetail === "string" ? errDetail : "Something went wrong."
}

export const handleError = function (
  this: (msg: string) => void,
  err: unknown,
) {
  const errorMessage = extractErrorMessage(err)
  this(errorMessage)
}

export const getInitials = (name: string): string => {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}
