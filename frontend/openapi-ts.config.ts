import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "../backend/openapi.yaml",
  output: "src/api/generated",
  parser: {
    patch: {
      schemas: {
        // The error interceptor in src/api/client.ts makes everything the client throws an Error,
        // so the generated error types can promise a message.
        ErrorModel: (schema) => {
          schema.properties = { ...schema.properties, message: { type: "string" } };
          schema.required = [...(schema.required ?? []), "message"];
        },
      },
    },
  },
  plugins: [
    "@hey-api/client-fetch",
    { name: "@hey-api/typescript", enums: "javascript" },
    "@hey-api/sdk",
    "zod",
    "@tanstack/react-query",
  ],
});
