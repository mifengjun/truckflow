import { expect, it } from "vitest";
import { readConfig } from "@/infrastructure/config";
it("does not expose values in configuration failures", () => {
  expect(() =>
    readConfig({ DATABASE_URL: "postgresql://secret:password@localhost/db" }),
  ).toThrow("CONFIGURATION_REQUIRED");
  try {
    readConfig({ DATABASE_URL: "postgresql://secret:password@localhost/db" });
  } catch (e) {
    expect(String(e)).not.toContain("password");
  }
});
it("rejects unsafe origins and requires separate runtime connection", () => {
  const env = {
    APP_ORIGIN: "javascript:bad",
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pub",
    SUPABASE_SECRET_KEY: "secret",
    DATABASE_URL: "postgresql://runtime:pass@host/db",
  };
  expect(() => readConfig(env)).toThrow();
  expect(
    readConfig({ ...env, APP_ORIGIN: "http://127.0.0.1:3000" }).origin,
  ).toBe("http://127.0.0.1:3000");
  expect(() =>
    readConfig({
      ...env,
      APP_ORIGIN: "http://127.0.0.1:3000",
      DATABASE_URL: "",
    }),
  ).toThrow();
});
