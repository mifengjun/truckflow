import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  registerCustomer,
  resendSignupVerification,
} from "@/modules/business/registration";
vi.mock("@/infrastructure/auth/throttle", () => ({ throttle: vi.fn() }));
vi.mock("@/infrastructure/config", () => ({
  readConfig: () => ({
    supabaseUrl: "https://auth.example.invalid",
    publishableKey: "test-publishable",
    origin: "https://truckflow.example.invalid",
  }),
}));
beforeEach(() => vi.stubEnv("REGISTRATION_ENABLED", "true"));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("sends and resends a resumable email link without accepting a password", async () => {
  const requests: { url: string; body: Record<string, unknown> }[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    requests.push({ url, body: JSON.parse(init.body as string) });
    return new Response("{}", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  for (const send of [registerCustomer, resendSignupVerification]) {
    expect(await send({ email: "Customer@Example.com" })).toMatchObject({
      email: "customer@example.com",
    });
  }
  expect(requests).toHaveLength(2);
  for (const request of requests) {
    const url = new URL(request.url);
    expect(url.pathname).toBe("/auth/v1/otp");
    expect(url.searchParams.get("redirect_to")).toBe(
      "https://truckflow.example.invalid/auth/verify",
    );
    expect(request.body).toMatchObject({
      email: "customer@example.com",
      create_user: true,
    });
    expect(request.body).not.toHaveProperty("password");
  }
});
it("reports mail rate limits without pretending the mail was sent", async () => {
  vi.stubGlobal(
    "fetch",
    async () =>
      new Response(
        JSON.stringify({
          error_code: "over_email_send_rate_limit",
          msg: "Rate limited",
        }),
        { status: 429, headers: { "content-type": "application/json" } },
      ),
  );
  await expect(
    registerCustomer({ email: "customer@example.com" }),
  ).rejects.toMatchObject({ code: "RATE_LIMITED", status: 429 });
});
