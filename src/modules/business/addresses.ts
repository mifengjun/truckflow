import "server-only";
import { eq, and, or, isNull, desc } from "drizzle-orm";
import { addresses } from "@/infrastructure/database/schema";
import { addressInput } from "./contracts";
import { database, auditAction, scope, activeCustomer } from "./common";
import { authorize, BusinessError, type Actor } from "./rules";
export async function listAddresses(actor: Actor) {
  authorize(actor, "customer_operator");
  return database()
    .select()
    .from(addresses)
    .where(
      and(
        isNull(addresses.archivedAt),
        or(eq(addresses.scope, "public"), scope(actor, addresses.customerId)),
      ),
    )
    .orderBy(desc(addresses.createdAt))
    .limit(100);
}
export async function createAddress(
  actor: Actor,
  input: unknown,
  customerId = actor.customerId!,
) {
  authorize(actor, "customer_operator", customerId);
  const data = addressInput.parse(input);
  return database().transaction(async (tx) => {
    await activeCustomer(tx, customerId);
    const [row] = await tx
      .insert(addresses)
      .values({ customerId, data })
      .returning();
    await auditAction(tx, actor, "address.create", customerId, row.id);
    return row;
  });
}
export async function updateAddress(
  actor: Actor,
  id: string,
  version: number,
  input: unknown,
) {
  const data = addressInput.parse(input);
  return database().transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(addresses)
      .where(eq(addresses.id, id))
      .for("update");
    if (!row || !row.customerId || row.scope !== "private")
      throw new BusinessError("NOT_FOUND", "地址不存在或不可编辑", 404);
    authorize(actor, "customer_operator", row.customerId);
    if (row.version !== version)
      throw new BusinessError("VERSION_CONFLICT", "地址已更新，请刷新");
    await activeCustomer(tx, row.customerId);
    const [updated] = await tx
      .update(addresses)
      .set({ data, version: version + 1 })
      .where(eq(addresses.id, id))
      .returning();
    await auditAction(tx, actor, "address.update", row.customerId, id);
    return updated;
  });
}
