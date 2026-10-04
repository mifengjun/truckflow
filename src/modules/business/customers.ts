import "server-only";
import { eq, desc } from "drizzle-orm";
import { customers, accounts } from "@/infrastructure/database/schema";
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
  return (
    await database().select().from(customers).where(eq(customers.id, id))
  )[0];
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
