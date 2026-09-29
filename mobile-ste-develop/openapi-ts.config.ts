import { defineConfig } from "@hey-api/openapi-ts"

export default defineConfig({
  input: "../backend/swagger.json",
  output: {
    format: "prettier",
    lint: "eslint",
    path: "./src/client",
  },
  plugins: [
    "@tanstack/react-query",
    {
      name: "@hey-api/client-axios",
      runtimeConfigPath: "@/config/heygen.config",
    },
  ],
})
