import { defineConfig } from "vitest/config";

/** Only `test/live/**` — real HTTP calls. Default `vitest.config.ts` excludes this folder. */
export default defineConfig({
  test: {
    include: ["test/live/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    globals: true,
    environment: "node",
    coverage: {
      reporter: ["text", "lcov"],
    },
  },
});
