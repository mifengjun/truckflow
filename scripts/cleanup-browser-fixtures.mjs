import { readFileSync, unlinkSync } from "node:fs";
import { parseEnv } from "node:util";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
const env = parseEnv(readFileSync(".env.local", "utf8"));
if (
  env.APP_ENV === "production" ||
  !/^http:\/\/(127\.0\.0\.1|localhost):/.test(env.APP_ORIGIN)
)
  throw new Error("QA cleanup requires local development");
if (
  decodeURIComponent(new URL(env.MIGRATION_DATABASE_URL).username) !==
  "postgres.halitnbbzwwfirscmnlf"
)
  throw new Error("Project mismatch");
const fixture = JSON.parse(readFileSync(".env.browser-test.local", "utf8")),
  ids = fixture.identities.map((i) => i.id);
const db = postgres(env.MIGRATION_DATABASE_URL, {
    max: 1,
    prepare: false,
    ssl: {
      ca: readFileSync("supabase-ca.crt", "utf8"),
      rejectUnauthorized: true,
    },
  }),
  client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
try {
  const [company] =
    await db`select name from app.customers where id=${fixture.companyId}`;
  if (company?.name !== "TEST 浏览器验收客户")
    throw new Error("Disposable fixture identity mismatch");
  const identities =
    await db`select u.email,p.name from app.profiles p join auth.users u on u.id=p.id where p.id=any(${ids}::uuid[])`;
  if (
    identities.length !== 2 ||
    identities.some(
      (row) =>
        !/^browser-(customer|staff)-[a-f0-9]{8}@example\.invalid$/.test(
          row.email,
        ) || !row.name.startsWith("TEST "),
    )
  )
    throw new Error("Disposable QA user identity mismatch");
  const paths =
    await db`select storage_path from app.attachments where customer_id=${fixture.companyId}`;
  if (paths.length) {
    const { error } = await client.storage
      .from("business-documents")
      .remove(paths.map((p) => p.storage_path));
    if (error) throw new Error("QA storage cleanup failed");
  }
  await db.begin(async (tx) => {
    await tx`delete from app.order_events where order_id in(select id from app.orders where customer_id=${fixture.companyId})`;
    await tx`delete from app.audit_events where actor_id=any(${ids}::uuid[])`;
    for (const table of [
      "ledger_entries",
      "fund_holds",
      "idempotency_records",
      "recharge_requests",
      "attachments",
      "orders",
      "quote_costs",
      "quotes",
      "inquiries",
      "addresses",
      "accounts",
      "staff_customer_access",
      "invitations",
    ])
      await tx.unsafe(`delete from app.${table} where customer_id=$1::uuid`, [
        fixture.companyId,
      ]);
    await tx`delete from app.profiles where id=any(${ids}::uuid[])`;
    await tx`delete from app.customers where id=${fixture.companyId}`;
  });
  for (const id of ids) {
    const { error } = await client.auth.admin.deleteUser(id);
    if (error) throw new Error("QA Auth cleanup failed");
  }
  unlinkSync(".env.browser-test.local");
  console.log("Disposable browser fixtures removed; administrator preserved");
} finally {
  await db.end();
}
