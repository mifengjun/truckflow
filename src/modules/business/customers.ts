import "server-only";
import { eq, desc, and, type SQL } from "drizzle-orm";
import {
  customers,
  accounts,
  profiles,
} from "@/infrastructure/database/schema";
import { adminClient } from "@/infrastructure/auth/supabase";
import { customerInput } from "./contracts";
import { database, auditAction, scope } from "./common";
import { authorize, BusinessError, type Actor } from "./rules";
export async function listCustomers(actor: Actor) {
  authorize(actor, "admin");
  return database()
    .select()
    .from(customers)
    .where(scope(actor, customers.id))
    .orderBy(desc(customers.createdAt))
    .limit(100);
}
export async function createCustomer(actor: Actor, input: unknown) {
  authorize(actor, "admin");
  if (!actor.allCustomers) authorize(actor, "admin", "__new_customer__");
  const data = customerInput.parse(input);
  return database().transaction(async (tx) => {
    const [c] = await tx.insert(customers).values(data).returning();
    await tx.insert(accounts).values({ customerId: c.id });
    await auditAction(tx, actor, "customer.create", c.id, c.id);
    return c;
  });
}
export async function getCustomer(actor: Actor, id: string) {
  authorize(
    actor,
    actor.identity === "staff" ? "admin" : "customer_operator",
    id,
  );
  const [customer] = await database()
    .select()
    .from(customers)
    .where(eq(customers.id, id));
  if (!customer) throw new BusinessError("NOT_FOUND", "客户不存在", 404);
  return customer;
}
export async function setCustomerStatus(
  actor: Actor,
  id: string,
  status: "active" | "frozen",
) {
  authorize(actor, "admin", id);
  return database().transaction(async (tx) => {
    const [row] = await tx
      .update(customers)
      .set({ status })
      .where(eq(customers.id, id))
      .returning();
    if (!row) throw new BusinessError("NOT_FOUND", "客户不存在", 404);
    await auditAction(tx, actor, `customer.${status}`, id, id);
    return row;
  });
}

// Authorize and scope the profile query before fetching any Auth email addresses.
async function accountDirectory(where: SQL, page: number) {
  if (!Number.isSafeInteger(page) || page < 0 || page > 100000)
    throw new BusinessError("INVALID_PAGE", "页码无效", 422);
  const rows = await database()
    .select()
    .from(profiles)
    .where(where)
    .orderBy(desc(profiles.createdAt), profiles.id)
    .limit(26)
    .offset(page * 25);
  const client = adminClient();
  const items: Array<typeof profiles.$inferSelect & { email: string }> = [];
  const visible = rows.slice(0, 25);
  for (let offset = 0; offset < visible.length; offset += 5) {
    const batch = await Promise.all(
      visible.slice(offset, offset + 5).map(async (profile) => {
        const { data, error } = await client.auth.admin.getUserById(profile.id);
        if (error || !data.user?.email)
          throw new BusinessError(
            "ACCOUNT_LOOKUP_FAILED",
            "账号信息暂时无法读取，请稍后重试",
            502,
          );
        return { ...profile, email: data.user.email };
      }),
    );
    items.push(...batch);
  }
  return { items, hasMore: rows.length > 25 };
}
export async function listCustomerMembers(
  actor: Actor,
  customerId: string,
  page = 0,
) {
  authorize(actor, "admin", customerId);
  if (actor.identity !== "staff")
    throw new BusinessError("FORBIDDEN", "没有执行此操作的权限", 403);
  await getCustomer(actor, customerId);
  return accountDirectory(
    and(
      eq(profiles.identity, "customer"),
      eq(profiles.customerId, customerId),
    )!,
    page,
  );
}
export async function listStaffAccounts(actor: Actor, page = 0) {
  authorize(actor, "admin");
  if (actor.identity !== "staff" || !actor.allCustomers)
    throw new BusinessError("FORBIDDEN", "仅全局管理员可查看员工账号", 403);
  return accountDirectory(eq(profiles.identity, "staff"), page);
}
