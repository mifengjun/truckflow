// Disposable QA identities. Never use this password for real accounts.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
if (existsSync(".env.browser-test.local"))
  throw new Error("Clean up existing browser fixtures first");
const env = parseEnv(readFileSync(".env.local", "utf8"));
if (
  env.APP_ENV === "production" ||
  !/^http:\/\/(127\.0\.0\.1|localhost):/.test(env.APP_ORIGIN)
)
  throw new Error("Disposable QA fixtures require local development");
const url = new URL(env.MIGRATION_DATABASE_URL);
if (decodeURIComponent(url.username) !== "postgres.halitnbbzwwfirscmnlf")
  throw new Error("Project mismatch");
const db = postgres(env.MIGRATION_DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: {
    ca: readFileSync("supabase-ca.crt", "utf8"),
    rejectUnauthorized: true,
  },
});
const client = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
try {
  const [company] =
    await db`insert into app.customers(name,contact,email,phone) values('TEST 浏览器验收客户','测试人员','qa@example.invalid','000') returning id`;
  await db`insert into app.accounts(customer_id) values(${company.id})`;
  const identities = [];
  for (const identity of ["customer", "staff"]) {
    const email = `browser-${identity}-${randomUUID().slice(0, 8)}@example.invalid`;
    const { data, error } = await client.auth.admin.createUser({
      email,
      password: "QA-Truckflow-Flow-2026-Only!",
      email_confirm: true,
    });
    if (error || !data.user) throw new Error("QA identity creation failed");
    const roles =
      identity === "customer"
        ? ["customer_operator", "customer_finance"]
        : ["operations", "finance", "admin", "cost_view"];
    await db`insert into app.profiles(id,name,identity,customer_id,roles,all_customers) values(${data.user.id},${identity === "customer" ? "TEST 客户" : "TEST 运营"},${identity},${identity === "customer" ? company.id : null},${roles},${identity === "staff"})`;
    identities.push({ identity, email, id: data.user.id });
  }
  writeFileSync(
    ".env.browser-test.local",
    JSON.stringify({ companyId: company.id, identities }),
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify(
      identities.map(({ identity, email }) => ({ identity, email })),
    ),
  );
} finally {
  await db.end();
}
