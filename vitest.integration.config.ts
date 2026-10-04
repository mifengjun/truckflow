import { defineConfig } from "vitest/config";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
if (process.env.APP_ENV === "production")
  throw new Error("Integration tests are disabled in production");
const local = parseEnv(readFileSync(".env.local", "utf8"));
if (local.APP_ENV === "production")
  throw new Error("Integration tests are disabled in production");
Object.assign(process.env, local);
export default defineConfig({
  resolve: {
    alias: {
      "server-only": new URL("./tests/helpers/server-only.ts", import.meta.url)
        .pathname,
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
  test: {
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
