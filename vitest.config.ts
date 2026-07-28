import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    pool: "threads",
    fileParallelism: false,
    testTimeout: 10_000,
    hookTimeout: 10_000,
    teardownTimeout: 5_000,
    coverage: { reporter: ["text", "html"] }
  }
});

