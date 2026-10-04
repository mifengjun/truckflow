import "server-only";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  inquiries,
  quotes,
  quoteCosts,
  orders,
} from "@/infrastructure/database/schema";
import { inquiryInput, quoteInput } from "./contracts";
import {
  database,
  scope,
  mustAccess,
  activeCustomer,
  auditAction,
} from "./common";
import { authorize, BusinessError, sumMoney, type Actor } from "./rules";
export async function createInquiry(
  actor: Actor,
  input: unknown,
  customerId = actor.customerId!,
) {
  authorize(actor, "customer_operator", customerId);
  const data = inquiryInput.parse(input);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: data.origin.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  if (data.pickupDate < today)
    throw new BusinessError("PAST_PICKUP", "提货日期不能早于提货地今天", 422);
  return database().transaction(async (tx) => {
    await activeCustomer(tx, customerId);
    const [row] = await tx
      .insert(inquiries)
      .values({ customerId, createdBy: actor.id, data })
      .returning();
    await auditAction(tx, actor, "inquiry.create", customerId, row.id);
    return row;
  });
}
export async function listInquiries(actor: Actor, page = 0) {
  authorize(actor, "customer_operator");
  return database()
    .select()
    .from(inquiries)
    .where(scope(actor, inquiries.customerId))
    .orderBy(desc(inquiries.createdAt), desc(inquiries.id))
    .limit(20)
    .offset(page * 20);
}
export async function getInquiry(actor: Actor, id: string) {
  authorize(actor, "customer_operator");
  const [row] = await database()
    .select()
    .from(inquiries)
    .where(and(eq(inquiries.id, id), scope(actor, inquiries.customerId)));
  if (!row) throw new BusinessError("NOT_FOUND", "询价不存在或不可访问", 404);
  const visibleQuotes = await database()
    .select({
      id: quotes.id,
      carrier: quotes.carrier,
      fees: quotes.fees,
      amount: quotes.amount,
      currency: quotes.currency,
      expiresAt: quotes.expiresAt,
      transit: quotes.transit,
      status: quotes.status,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.inquiryId, id),
        actor.identity === "customer"
          ? eq(quotes.status, "published")
          : sql`true`,
      ),
    )
    .orderBy(desc(quotes.createdAt));
  const [order] = await database()
    .select({ id: orders.id, number: orders.number })
    .from(orders)
    .where(eq(orders.inquiryId, id));
  return { ...row, quotes: visibleQuotes, order: order ?? null };
}
export async function createQuote(
  actor: Actor,
  inquiryId: string,
  input: unknown,
) {
  authorize(actor, "operations");
  const data = quoteInput.parse(input),
    amount = sumMoney(data.fees.map((f) => f.amount));
  if (Number(amount) <= 0 || Date.parse(data.expiresAt) <= Date.now())
    throw new BusinessError(
      "INVALID_QUOTE",
      "报价金额须大于零，有效期须晚于当前时间",
      422,
    );
  return database().transaction(async (tx) => {
    const [inq] = await tx
      .select()
      .from(inquiries)
      .where(eq(inquiries.id, inquiryId))
      .for("update");
    if (!inq) throw new BusinessError("NOT_FOUND", "询价不存在", 404);
    mustAccess(actor, inq.customerId);
    await activeCustomer(tx, inq.customerId);
    if (inq.status === "ordered")
      throw new BusinessError("ALREADY_ORDERED", "询价已下单，请创建新询价");
    const [q] = await tx
      .insert(quotes)
      .values({
        inquiryId,
        customerId: inq.customerId,
        carrier: data.carrier,
        fees: data.fees,
        amount,
        expiresAt: data.expiresAt,
        transit: data.transit,
        evidence: data.evidence,
        createdBy: actor.id,
      })
      .returning();
    await tx
      .insert(quoteCosts)
      .values({ quoteId: q.id, customerId: q.customerId, amount: data.cost });
    await auditAction(tx, actor, "quote.create", q.customerId, q.id);
    return { id: q.id, status: q.status };
  });
}
export async function publishQuote(actor: Actor, id: string) {
  authorize(actor, "operations");
  const [initial] = await database()
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, id), scope(actor, quotes.customerId)));
  if (!initial) throw new BusinessError("NOT_FOUND", "报价不存在", 404);
  return database().transaction(async (tx) => {
    await tx
      .select({ id: inquiries.id })
      .from(inquiries)
      .where(eq(inquiries.id, initial.inquiryId))
      .for("update");
    const [q] = await tx
      .select()
      .from(quotes)
      .where(eq(quotes.id, id))
      .for("update");
    if (!q) throw new BusinessError("NOT_FOUND", "报价不存在", 404);
    mustAccess(actor, q.customerId);
    await activeCustomer(tx, q.customerId);
    if (Date.parse(q.expiresAt) <= Date.now())
      throw new BusinessError("QUOTE_EXPIRED", "报价已过期，请录入新报价");
    const [inq] = await tx
      .select()
      .from(inquiries)
      .where(eq(inquiries.id, q.inquiryId));
    if (inq.status === "ordered")
      throw new BusinessError("ALREADY_ORDERED", "询价已下单");
    await tx
      .update(quotes)
      .set({ status: "published", publishedAt: new Date().toISOString() })
      .where(eq(quotes.id, id));
    await tx
      .update(inquiries)
      .set({ status: "quoted", reason: null })
      .where(eq(inquiries.id, q.inquiryId));
    await auditAction(tx, actor, "quote.publish", q.customerId, id);
    return { id, status: "published" };
  });
}
export async function noQuote(actor: Actor, id: string, reason: string) {
  authorize(actor, "operations");
  return database().transaction(async (tx) => {
    const [inq] = await tx
      .select()
      .from(inquiries)
      .where(eq(inquiries.id, id))
      .for("update");
    if (!inq) throw new BusinessError("NOT_FOUND", "询价不存在", 404);
    mustAccess(actor, inq.customerId);
    if (inq.status === "ordered")
      throw new BusinessError("ALREADY_ORDERED", "询价已下单");
    const valid = await tx
      .select({ id: quotes.id })
      .from(quotes)
      .where(
        and(
          eq(quotes.inquiryId, id),
          eq(quotes.status, "published"),
          sql`${quotes.expiresAt}>now()`,
        ),
      );
    if (valid.length)
      throw new BusinessError("ACTIVE_QUOTES", "仍有有效报价，不能标记无报价");
    await tx
      .update(inquiries)
      .set({ status: "no_quote", reason })
      .where(eq(inquiries.id, id));
    await auditAction(tx, actor, "inquiry.no_quote", inq.customerId, id);
    return { id, status: "no_quote" };
  });
}
