import { afterAll, expect, it } from "vitest";
import { adminDb as sql } from "../helpers/database";
afterAll(() => sql.end());
it("has constrained private tables and denies anonymous access", async () => {
  const rows =
    await sql`select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='app' and c.relkind='r'`;
  expect(rows.some((r) => r.relname === "accounts")).toBe(true);
  expect(rows.every((r) => r.relrowsecurity)).toBe(true);
  expect(
    (await sql`select has_schema_privilege('anon','app','usage') as allowed`)[0]
      .allowed,
  ).toBe(false);
});
it("rolls back partial writes and rejects money below occupied funds", async () => {
  await expect(
    sql.begin(async (tx) => {
      const [c] =
        await tx`insert into app.customers(name,contact,email,phone) values('TEST rollback','Tester','rollback@example.invalid','000') returning id`;
      await tx`insert into app.accounts(customer_id,balance,held_amount) values(${c.id},10,20)`;
    }),
  ).rejects.toBeDefined();
  expect(
    (await sql`select id from app.customers where name='TEST rollback'`).length,
  ).toBe(0);
});
