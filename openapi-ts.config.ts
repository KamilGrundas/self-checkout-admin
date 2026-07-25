import { defineConfig } from "@hey-api/openapi-ts"

export default defineConfig({
  input: "./openapi.json",
  output: "./src/client",

  plugins: [
    "@hey-api/typescript",
    {
      name: "@hey-api/client-fetch",
      throwOnError: true,
    },
    {
      name: "@hey-api/sdk",
      client: true,
      paramsStructure: "flat",
      responseStyle: "data",
      operations: {
        strategy: "byTags",
        containerName: "{{name}}Service",
        methodName: (name) => {
          const servicePrefixes = [
            "categories",
            "checkoutCounters",
            "checkoutSessions",
            "items",
            "login",
            "private",
            "products",
            "users",
            "utils",
          ]
          for (const prefix of servicePrefixes) {
            if (name.startsWith(prefix) && name.length > prefix.length) {
              const method = name.slice(prefix.length)
              return method.charAt(0).toLowerCase() + method.slice(1)
            }
          }
          return name
        },
      },
    },
    {
      name: "@hey-api/schemas",
      type: "json",
    },
  ],
})
