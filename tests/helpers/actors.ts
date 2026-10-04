import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { adminDb } from "./database";
import type { Actor } from "@/modules/business/rules";
const auth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
export async function createActors() {
  const users: string[] = [],
    companies: string[] = [];
  const label = randomUUID().slice(0, 8);
  for (const key of ["a", "b"]) {
    const [c] =
      await adminDb`insert into app.customers(name,contact,email,phone) values(${"TEST QA " + key + label},'Tester',${key + label + "@example.invalid"},'000') returning id`;
    companies.push(c.id);
    await adminDb`insert into app.accounts(customer_id) values(${c.id})`;
  }
  const actors: Actor[] = [];
  const credentials:{email:string;password:string}[]=[];
  for (let i = 0; i < 3; i++) {
    const credential={email:`qa-${label}-${i}@example.invalid`,password:randomUUID()+"Aa1!"};
    credentials.push(credential);
    const { data, error } = await auth.auth.admin.createUser({
      ...credential,
      email_confirm: true,
    });
    if (error || !data.user)
      throw new Error("Unable to create isolated test identity");
    users.push(data.user.id);
    const roles: Actor["roles"] =
      i < 2
        ? ["customer_operator", "customer_finance"]
        : ["operations", "finance", "admin", "cost_view"];
    await adminDb`insert into app.profiles(id,name,identity,customer_id,roles,all_customers) values(${data.user.id},'TEST QA',${i < 2 ? "customer" : "staff"},${i < 2 ? companies[i] : null},${roles},${i === 2})`;
    actors.push({
      id: data.user.id,
      name: "TEST QA",
      identity: i < 2 ? "customer" : "staff",
      customerId: i < 2 ? companies[i] : null,
      roles,
      allCustomers: i === 2,
      customerIds: [],
    });
  }
  return {
    credentials,
    a: actors[0],
    b: actors[1],
    staff: actors[2],
    cleanup: async () => {
      await adminDb.begin(async (tx) => {
        await tx`delete from app.order_events where order_id in(select id from app.orders where customer_id=any(${companies}::uuid[]))`;
        await tx`delete from app.audit_events where actor_id=any(${users}::uuid[])`;
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
          await tx.unsafe(
            `delete from app.${table} where customer_id=any($1::uuid[])`,
            [companies],
          );
        await tx`delete from app.profiles where id=any(${users}::uuid[])`;
        await tx`delete from app.customers where id=any(${companies}::uuid[])`;
      });
      for (const id of users) await auth.auth.admin.deleteUser(id);
    },
  };
}
