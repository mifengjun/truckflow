import "server-only";
import { eq, and, inArray, sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import {
  getDatabase,
  type Transaction,
} from "@/infrastructure/database/client";
import { customers, audit, accounts } from "@/infrastructure/database/schema";
import { BusinessError, type Actor, canAccess } from "./rules";
export function scope(actor: Actor, column: PgColumn): SQL {
  return actor.identity === "customer"
    ? eq(column, actor.customerId!)
    : actor.allCustomers
      ? sql`true`
      : actor.customerIds.length
        ? inArray(column, actor.customerIds)
        : sql`false`;
}
export function mustAccess(actor: Actor, customerId: string) {
  if (!canAccess(actor, customerId))
    throw new BusinessError("NOT_FOUND", "记录不存在或不可访问", 404);
}
export async function activeCustomer(tx: Transaction, customerId: string) {
  const [c] = await tx
    .select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .for("share");
  if (!c || c.status !== "active")
    throw new BusinessError("CUSTOMER_FROZEN", "客户当前不能创建新业务", 403);
  return c;
}
export async function auditAction(
  tx: Transaction,
  actor: Actor,
  action: string,
  customerId: string | null,
  resourceId: string,
) {
  await tx
    .insert(audit)
    .values({ actorId: actor.id, action, customerId, resourceId });
}
export async function lockedAccount(tx: Transaction, customerId: string) {
  const [a] = await tx
    .select()
    .from(accounts)
    .where(
      and(eq(accounts.customerId, customerId), eq(accounts.currency, "USD")),
    )
    .for("update");
  if (!a) throw new BusinessError("ACCOUNT_MISSING", "资金账户尚未建立", 503);
  return a;
}
export const database = getDatabase;
