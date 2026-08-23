import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "../Backend/swagger.json",
  output: {
    path: "src/api",
    format: "prettier"
  },
  plugins: [
    {
      name: "@hey-api/client-axios",
      bundle: true
    },
    {
      name: "@hey-api/sdk",
      operations: { nesting: "operationId" }
    },
    {
      name: "@hey-api/typescript",
      enums: "javascript"
    }
  ]
});
