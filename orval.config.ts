import { defineConfig } from "orval";

export default defineConfig({
  signal: {
    input: {
      target: "./docs/swagger.openapi.json",
    },
    output: {
      mode: "single",
      target: "./src/lib/api/generated/signal.ts",
      schemas: "./src/lib/api/generated/model",
      client: "react-query",
      httpClient: "fetch",
      clean: true,
      prettier: false,
      mock: false,
      override: {
        mutator: {
          path: "./src/lib/api/orval-mutator.ts",
          name: "customFetch",
        },
        query: {
          useQuery: true,
          useInfinite: false,
          useSuspenseQuery: false,
          useSuspenseInfiniteQuery: false,
          shouldExportQueryKey: true,
          shouldExportMutatorHooks: false,
        },
      },
    },
  },
});
