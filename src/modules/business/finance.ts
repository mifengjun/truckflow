import "server-only";
import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  accounts,
  ledger,
  recharges,
  attachments,
} from "@/infrastructure/database/schema";
import { rechargeInput, moneyInput } from "./contracts";
import { database, scope, lockedAccount, auditAction } from "./common";
import { authorize, BusinessError, available, type Actor } from "./rules";
export async function getAccount(actor: Actor, customerId = actor.customerId!) {
  authorize(actor, "customer_finance", customerId);
  const [a] = await database()
    .select()
    .from(accounts)
    .where(eq(accounts.customerId, customerId));
  if (!a) throw new BusinessError("ACCOUNT_MISSING", "资金账户尚未建立", 503);
  return { ...a, available: available(a.balance, a.heldAmount) };
}
export async function listLedger(
  actor: Actor,
  customerId = actor.customerId!,
  page = 0,
) {
  authorize(actor, "customer_finance", customerId);
  return database()
    .select()
    .from(ledger)
    .where(eq(ledger.customerId, customerId))
    .orderBy(desc(ledger.createdAt), desc(ledger.id))
    .limit(20)
    .offset(page * 20);
}
export async function listRecharges(actor: Actor, page = 0) {
  authorize(actor, "customer_finance");
  return database()
    .select()
    .from(recharges)
    .where(scope(actor, recharges.customerId))
    .orderBy(desc(recharges.createdAt), desc(recharges.id))
    .limit(20)
    .offset(page * 20);
}
export async function createRecharge(actor: Actor, input: unknown) {
  authorize(actor, "customer_finance", actor.customerId!);
  const data = rechargeInput.parse(input);
  return database().transaction(async (tx) => {
    const [proof] = await tx
      .select()
      .from(attachments)
      .where(
        and(
          eq(attachments.id, data.proofId),
          eq(attachments.customerId, actor.customerId!),
          eq(attachments.createdBy, actor.id),
          eq(attachments.kind, "recharge_proof"),
        ),
      )
      .for("update");
    if (!proof)
      throw new BusinessError("PROOF_MISSING", "请上传本公司的转账凭证", 422);
    const [r] = await tx
      .insert(recharges)
      .values({
        customerId: actor.customerId!,
        amount: data.amount,
        reference: data.reference,
        proofId: data.proofId,
        createdBy: actor.id,
      })
      .returning();
    await auditAction(tx, actor, "recharge.request", r.customerId, r.id);
    return r;
  });
}
const verification = z
  .object({
    expectedVersion: z.number().int().positive(),
    amount: moneyInput.refine((v) => Number(v) > 0),
    bankReference: z.string().trim().min(1).max(200),
    reason: z.string().trim().min(2).max(2000),
  })
  .strict();
export async function verifyRecharge(actor: Actor, id: string, input: unknown) {
  const data = verification.parse(input);
  const [initial] = await database()
    .select()
    .from(recharges)
    .where(eq(recharges.id, id));
  if (!initial) throw new BusinessError("NOT_FOUND", "充值申请不存在", 404);
  authorize(actor, "finance", initial.customerId);
  return database().transaction(async (tx) => {
    const a = await lockedAccount(tx, initial.customerId);
    const [r] = await tx
      .select()
      .from(recharges)
      .where(eq(recharges.id, id))
      .for("update");
    if (r.status !== "pending" || r.version !== data.expectedVersion)
      throw new BusinessError("STATE_CONFLICT", "申请已处理，请刷新");
    await tx
      .update(accounts)
      .set({ balance: sql`${accounts.balance}+${data.amount}::numeric` })
      .where(eq(accounts.id, a.id));
    await tx
      .update(recharges)
      .set({
        status: "verified",
        receivedAmount: data.amount,
        bankReference: data.bankReference,
        reason: data.reason,
        version: r.version + 1,
        verifiedBy: actor.id,
        verifiedAt: new Date().toISOString(),
      })
      .where(eq(recharges.id, id));
    await tx.insert(ledger).values({
      customerId: r.customerId,
      accountId: a.id,
      rechargeId: id,
      eventKey: `recharge:${id}`,
      type: "recharge",
      amount: data.amount,
      balanceDelta: data.amount,
      heldDelta: "0.00",
      actorId: actor.id,
    });
    await auditAction(tx, actor, "recharge.verify", r.customerId, id);
    return { id, status: "verified" };
  });
}
export async function rejectRecharge(
  actor: Actor,
  id: string,
  version: number,
  reason: string,
) {
  return database().transaction(async (tx) => {
    const [r] = await tx
      .select()
      .from(recharges)
      .where(eq(recharges.id, id))
      .for("update");
    if (!r) throw new BusinessError("NOT_FOUND", "充值申请不存在", 404);
    authorize(actor, "finance", r.customerId);
    if (r.status !== "pending" || r.version !== version)
      throw new BusinessError("STATE_CONFLICT", "申请已处理");
    await tx
      .update(recharges)
      .set({
        status: "rejected",
        reason,
        version: version + 1,
        verifiedBy: actor.id,
        verifiedAt: new Date().toISOString(),
      })
      .where(eq(recharges.id, id));
    await auditAction(tx, actor, "recharge.reject", r.customerId, id);
    return { id, status: "rejected" };
  });
}
export async function getAvailableFunds(actor: Actor) {
  authorize(actor, "customer_operator", actor.customerId!);
  if (!actor.customerId)
    throw new BusinessError("FORBIDDEN", "仅限客户查询", 403);
  const [a] = await database()
    .select()
    .from(accounts)
    .where(eq(accounts.customerId, actor.customerId));
  if (!a) throw new BusinessError("ACCOUNT_MISSING", "资金账户尚未建立", 503);
  return {
    available: available(a.balance, a.heldAmount),
    currency: a.currency,
  };
}
