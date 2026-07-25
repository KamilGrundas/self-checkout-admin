export class ApiClientError extends Error {
  constructor(
    public readonly status: number | undefined,
    public readonly body: unknown,
  ) {
    super(
      typeof body === "object" &&
        body !== null &&
        "detail" in body &&
        typeof body.detail === "string"
        ? body.detail
        : "API request failed",
    )
    this.name = "ApiClientError"
  }
}
