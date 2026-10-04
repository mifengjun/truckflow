import { afterAll, beforeAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { adminDb } from "../helpers/database";
const origin = process.env.APP_ORIGIN!;
const auth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
);
const users: { id: string; email: string; password: string }[] = [];
let cookie = "";
async function request(
  path: string,
  data?: unknown,
  cookieValue = cookie,
  requestOrigin = origin,
) {
  return fetch(`${origin}/api/v1/${path}`, {
    method: data === undefined ? "GET" : "POST",
    headers: {
      cookie: cookieValue,
      ...(data !== undefined
        ? { "content-type": "application/json", origin: requestOrigin }
        : {}),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
}
beforeAll(async () => {
  for (const confirmed of [true, false, true]) {
    const credential = {
      email: `qa-registration-${randomUUID()}@example.invalid`,
      password: randomUUID() + "Aa1!",
    };
    const { data, error } = await auth.auth.admin.createUser({
      ...credential,
      email_confirm: confirmed,
    });
    if (error || !data.user) throw Error("QA creation failed");
    users.push({ id: data.user.id, ...credential });
  }
});
afterAll(async () => {
  for (const u of users) {
    const [p] =
      await adminDb`select customer_id from app.profiles where id=${u.id}`;
    await adminDb`delete from app.audit_events where actor_id=${u.id}`;
    await adminDb`delete from app.profiles where id=${u.id}`;
    if (p?.customer_id) {
      await adminDb`delete from app.accounts where customer_id=${p.customer_id}`;
      await adminDb`delete from app.customers where id=${p.customer_id}`;
    }
    await auth.auth.admin.deleteUser(u.id);
  }
  await adminDb.end();
});
it("rejects anonymous onboarding and cross site registration", async () => {
  expect((await request("auth/onboarding", undefined, "")).status).toBe(401);
  expect(
    (await request("auth/register", {}, "", "https://evil.invalid")).status,
  ).toBe(403);
});
it("does not allow unverified identities into onboarding", async () => {
  const r = await request(
    "auth/login",
    { email: users[1].email, password: users[1].password },
    "",
  );
  expect(r.status).toBe(401);
});
it("keeps a verified unprovisioned login session for idempotent onboarding", async () => {
  const r = await request(
    "auth/login",
    { email: users[0].email, password: users[0].password },
    "",
  );
  expect(r.status).toBe(200);
  expect(await r.json()).toMatchObject({ destination: "/onboarding" });
  cookie = r.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  expect((await request("orders")).status).toBe(403);
  const payload = {
    companyName: "TEST HTTP 注册",
    contact: "TEST User",
    phone: "+1 5551234567",
  };
  const [a, b] = await Promise.all([
    request("auth/onboarding", payload),
    request("auth/onboarding", payload),
  ]);
  expect(a.status).toBe(200);
  expect(b.status).toBe(200);
  const first = await a.json(),
    second = await b.json();
  expect(second.customerId).toBe(first.customerId);
  expect((await request("orders")).status).toBe(200);
  expect(
    (await request("auth/onboarding", { ...payload, roles: ["admin"] })).status,
  ).toBe(422);
});
it("keeps public signup closed until real email delivery is configured", async () => {
  const r = await request(
    "auth/register",
    {
      email: "qa-no-send@example.invalid",
      password: "LongPassword123!",
      confirmPassword: "LongPassword123!",
    },
    "",
  );
  expect(r.status).toBe(503);
});
it("confirms signup on another device and recovers expired links safely", async () => {
  const { data, error } = await auth.auth.admin.generateLink({
    type: "signup",
    email: users[1].email,
    password: users[1].password,
  });
  if (error || !data.properties?.hashed_token)
    throw Error("QA signup link generation failed");
  const target = `${origin}/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=signup`;
  const first = await fetch(target, { redirect: "manual" });
  expect(first.status).toBe(307);
  expect(first.headers.get("location")).toBe(`${origin}/onboarding`);
  const again = await fetch(target, { redirect: "manual" });
  expect(again.headers.get("location")).toBe(
    `${origin}/auth/verify?status=invalid`,
  );
  const external = await fetch(
    `${origin}/auth/confirm?type=unknown&next=https://evil.invalid`,
    { redirect: "manual" },
  );
  expect(external.headers.get("location")).toBe(
    `${origin}/auth/verify?status=invalid`,
  );
});

it("allows verified users to set a six-character password before onboarding", async () => {
  const login = await request(
    "auth/login",
    { email: users[2].email, password: users[2].password },
    "",
  );
  expect(login.status).toBe(200);
  const session = login.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  const reset = await request(
    "auth/password",
    { password: "abc123" },
    session,
  );
  expect(reset.status).toBe(200);
  expect(await reset.json()).toMatchObject({ destination: "/onboarding" });
});
