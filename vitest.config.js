import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.js"],
    environment: "node",
    include: ["tests/**/*.test.js"],
    exclude: ["node_modules", "dist", ".git"],
    testTimeout: 10_000,
    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
    },
  },
});
