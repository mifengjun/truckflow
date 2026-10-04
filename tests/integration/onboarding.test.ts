import { afterAll, beforeAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { adminDb } from "../helpers/database";
import {
  completeOnboarding,
  getOnboardingState,
} from "@/modules/business/onboarding";
const auth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false } },
);
const identities: { id: string; email: string }[] = [];
const input = {
  companyName: "TEST 自助注册",
  contact: "TEST 联系人",
  phone: "+86 13800000000",
};
beforeAll(async () => {
  for (let n = 0; n < 2; n++) {
    const email = `qa-onboarding-${randomUUID()}@example.invalid`;
    const { data, error } = await auth.auth.admin.createUser({
      email,
      password: randomUUID() + "Aa!1",
      email_confirm: true,
    });
    if (error || !data.user) throw Error("QA creation failed");
    identities.push({ id: data.user.id, email });
  }
});
afterAll(async () => {
  for (const identity of identities) {
    const rows =
      await adminDb`select customer_id from app.profiles where id=${identity.id}`;
    await adminDb`delete from app.audit_events where actor_id=${identity.id}`;
    await adminDb`delete from app.profiles where id=${identity.id}`;
    if (rows[0]?.customer_id) {
      await adminDb`delete from app.accounts where customer_id=${rows[0].customer_id}`;
      await adminDb`delete from app.customers where id=${rows[0].customer_id}`;
    }
    await auth.auth.admin.deleteUser(identity.id);
  }
  await adminDb.end();
});
it("serializes repeated onboarding into one zero balance customer", async () => {
  expect(await getOnboardingState(identities[0])).toMatchObject({
    needsOnboarding: true,
    destination: "/onboarding",
  });
  const [a, b] = await Promise.all([
    completeOnboarding(identities[0], input),
    completeOnboarding(identities[0], input),
  ]);
  expect(a.customerId).toBe(b.customerId);
  const [account] =
    await adminDb`select balance,currency from app.accounts where customer_id=${a.customerId}`;
  expect(account).toMatchObject({ balance: "0.00", currency: "USD" });
  const [profile] =
    await adminDb`select roles,identity from app.profiles where id=${identities[0].id}`;
  expect(profile).toMatchObject({
    identity: "customer",
    roles: ["customer_operator", "customer_finance"],
  });
  const [customer] =
    await adminDb`select source from app.customers where id=${a.customerId}`;
  expect(customer.source).toBe("self_signup");
});
it("does not join customers by matching company names", async () => {
  const a = await completeOnboarding(identities[0], input),
    b = await completeOnboarding(identities[1], input);
  expect(b.customerId).not.toBe(a.customerId);
});
it("rejects role injection and preserves an already established profile", async () => {
  await expect(
    completeOnboarding(identities[0], { ...input, roles: ["admin"] }),
  ).rejects.toThrow();
  await adminDb`update app.profiles set active=false where id=${identities[0].id}`;
  await expect(completeOnboarding(identities[0], input)).rejects.toMatchObject({
    code: "ACCOUNT_DISABLED",
  });
  await adminDb`update app.profiles set active=true where id=${identities[0].id}`;
});
it("does not turn an employee into a self signup customer", async () => {
  const [p] =
    await adminDb`select customer_id from app.profiles where id=${identities[1].id}`;
  await adminDb`update app.profiles set identity='staff',customer_id=null,roles=ARRAY['admin'] where id=${identities[1].id}`;
  try {
    await expect(
      completeOnboarding(identities[1], input),
    ).rejects.toMatchObject({ code: "ALREADY_PROVISIONED" });
    expect(await getOnboardingState(identities[1])).toMatchObject({
      destination: "/admin/customers",
      needsOnboarding: false,
    });
  } finally {
    await adminDb`update app.profiles set identity='customer',customer_id=${p.customer_id},roles=ARRAY['customer_operator','customer_finance'] where id=${identities[1].id}`;
  }
});
it("rolls back customer and account when the identity cannot be provisioned", async () => {
  const email = `qa-rollback-${randomUUID()}@example.invalid`;
  await expect(
    completeOnboarding({ id: randomUUID(), email }, input),
  ).rejects.toThrow();
  expect(
    await adminDb`select id from app.customers where email=${email}`,
  ).toHaveLength(0);
});
it("does not claim a pending invited identity", async () => {
  const email = `qa-invited-${randomUUID()}@example.invalid`;
  const [p] =
    await adminDb`select customer_id from app.profiles where id=${identities[0].id}`;
  await adminDb`insert into app.invitations(customer_id,email,name,roles,created_by) values(${p.customer_id},${email},'TEST pending',ARRAY['customer_operator'],${identities[0].id})`;
  try {
    await expect(
      completeOnboarding({ id: randomUUID(), email }, input),
    ).rejects.toMatchObject({ code: "INVITED_ACCOUNT" });
  } finally {
    await adminDb`delete from app.invitations where email=${email}`;
  }
});
