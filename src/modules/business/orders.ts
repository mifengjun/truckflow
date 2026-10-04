import "server-only";
import { createHash } from "node:crypto";
import Decimal from "decimal.js";
import { z } from "zod";
import {
  eq,
  and,
  or,
  asc,
  desc,
  sql,
  ilike,
  gte,
  lte,
  count,
  getTableColumns,
} from "drizzle-orm";
import {
  orders,
  customers,
  inquiries,
  quotes,
  accounts,
  holds,
  ledger,
  idempotency,
  events,
  attachments,
} from "@/infrastructure/database/schema";
import { resultInput } from "./contracts";
import { LIST_PAGE_SIZE, searchPattern, type OrderListQuery } from "./listing";
import {
  database,
  scope,
  mustAccess,
  activeCustomer,
  lockedAccount,
  auditAction,
} from "./common";
import {
  authorize,
  BusinessError,
  available,
  checkTransition,
  type Actor,
} from "./rules";
export async function createOrder(actor: Actor, quoteId: string, key: string) {
  authorize(actor, "customer_operator");
  z.uuid().parse(quoteId);
  z.uuid().parse(key);
  const [initial] = await database()
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, quoteId), scope(actor, quotes.customerId)));
  if (!initial) throw new BusinessError("NOT_FOUND", "报价不存在", 404);
  const hash = createHash("sha256").update(quoteId).digest("hex");
  return database().transaction(async (tx) => {
    const [inq] = await tx
      .select()
      .from(inquiries)
      .where(eq(inquiries.id, initial.inquiryId))
      .for("update");
    const [prior] = await tx
      .select()
      .from(idempotency)
      .where(
        and(
          eq(idempotency.customerId, initial.customerId),
          eq(idempotency.operation, "order.create"),
          eq(idempotency.key, key),
        ),
      );
    if (prior) {
      if (prior.payloadHash !== hash)
        throw new BusinessError(
          "IDEMPOTENCY_CONFLICT",
          "提交标识已用于其他报价",
        );
      const [o] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, prior.orderId));
      return o;
    }
    if (inq.status === "ordered")
      throw new BusinessError(
        "ALREADY_ORDERED",
        "此询价已生成订单，请查看订单",
      );
    const [q] = await tx
      .select()
      .from(quotes)
      .where(eq(quotes.id, quoteId))
      .for("update");
    if (q.status !== "published" || Date.parse(q.expiresAt) <= Date.now())
      throw new BusinessError(
        "QUOTE_EXPIRED",
        "报价尚未发布或已过期，请重新询价",
      );
    await activeCustomer(tx, q.customerId);
    const a = await lockedAccount(tx, q.customerId);
    if (new Decimal(available(a.balance, a.heldAmount)).lt(q.amount))
      throw new BusinessError(
        "INSUFFICIENT_FUNDS",
        "可用余额不足，请充值并等待财务核验",
      );
    const [o] = await tx
      .insert(orders)
      .values({
        customerId: q.customerId,
        inquiryId: inq.id,
        quoteId: q.id,
        createdBy: actor.id,
        amount: q.amount,
        snapshot: {
          inquiry: inq.data,
          carrier: q.carrier,
          fees: q.fees,
          amount: q.amount,
          currency: "USD",
          transit: q.transit,
        },
      })
      .returning();
    await tx.insert(holds).values({
      customerId: q.customerId,
      accountId: a.id,
      orderId: o.id,
      amount: q.amount,
    });
    await tx
      .update(accounts)
      .set({ heldAmount: sql`${accounts.heldAmount}+${q.amount}::numeric` })
      .where(eq(accounts.id, a.id));
    await tx.insert(ledger).values({
      customerId: q.customerId,
      accountId: a.id,
      orderId: o.id,
      eventKey: `freeze:${o.id}`,
      type: "freeze",
      amount: q.amount,
      balanceDelta: "0.00",
      heldDelta: q.amount,
      actorId: actor.id,
    });
    await tx.insert(idempotency).values({
      customerId: q.customerId,
      operation: "order.create",
      key,
      payloadHash: hash,
      orderId: o.id,
    });
    await tx
      .update(inquiries)
      .set({ status: "ordered" })
      .where(eq(inquiries.id, inq.id));
    await tx.insert(events).values({
      orderId: o.id,
      actorId: actor.id,
      event: "pending_review",
      detail: "订单已提交，运费已冻结，等待运营审核。",
      visibility: "customer",
    });
    await auditAction(tx, actor, "order.create", q.customerId, o.id);
    return o;
  });
}
export async function listOrders(actor: Actor, page = 0) {
  authorize(actor, "customer_operator");
  return database()
    .select()
    .from(orders)
    .where(scope(actor, orders.customerId))
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(20)
    .offset(page * 20);
}
export async function getOrderPage(
  actor: Actor,
  page: number,
  query: OrderListQuery,
) {
  authorize(actor, "customer_operator");
  const pattern = searchPattern(query.search);
  const pickupDate = sql<string>`${orders.snapshot}->'inquiry'->>'pickupDate'`;
  const where = and(
    scope(actor, orders.customerId),
    query.status ? eq(orders.status, query.status) : undefined,
    query.from ? gte(pickupDate, query.from) : undefined,
    query.to ? lte(pickupDate, query.to) : undefined,
    query.search
      ? or(
          ilike(orders.number, pattern),
          ilike(orders.externalId, pattern),
          ilike(orders.tracking, pattern),
          sql`${orders.snapshot}->>'carrier' ilike ${pattern}`,
          sql`concat_ws(' ', ${orders.snapshot}->'inquiry'->'origin'->>'city', ${orders.snapshot}->'inquiry'->'origin'->>'state', ${orders.snapshot}->'inquiry'->'destination'->>'city', ${orders.snapshot}->'inquiry'->'destination'->>'state') ilike ${pattern}`,
          actor.identity === "staff"
            ? ilike(customers.name, pattern)
            : undefined,
        )
      : undefined,
  );
  const columns = {
    createdAt: orders.createdAt,
    number: orders.number,
    amount: orders.amount,
    pickupDate,
  };
  const order =
    query.direction === "asc"
      ? asc(columns[query.sort])
      : desc(columns[query.sort]);
  const [rows, [result]] = await Promise.all([
    database()
      .select({
        ...getTableColumns(orders),
        ...(actor.identity === "staff" ? { customerName: customers.name } : {}),
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(where)
      .orderBy(order, desc(orders.id))
      .limit(LIST_PAGE_SIZE)
      .offset(page * LIST_PAGE_SIZE),
    database()
      .select({ total: count() })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(where),
  ]);
  return { rows, total: result.total, page, pageSize: LIST_PAGE_SIZE };
}
export async function getOrder(actor: Actor, id: string) {
  authorize(actor, "customer_operator");
  const [o] = await database()
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), scope(actor, orders.customerId)));
  if (!o) throw new BusinessError("NOT_FOUND", "订单不存在", 404);
  const timeline = await database()
    .select()
    .from(events)
    .where(
      and(
        eq(events.orderId, id),
        actor.identity === "customer"
          ? eq(events.visibility, "customer")
          : sql`true`,
      ),
    )
    .orderBy(desc(events.createdAt), desc(events.id));
  const documents = await database()
    .select({
      id: attachments.id,
      filename: attachments.filename,
      kind: attachments.kind,
      createdAt: attachments.createdAt,
    })
    .from(attachments)
    .where(
      and(
        eq(attachments.orderId, id),
        actor.identity === "customer"
          ? eq(attachments.customerVisible, true)
          : sql`true`,
      ),
    );
  return { ...o, timeline, documents };
}
export async function startOrder(actor: Actor, id: string, version: number) {
  authorize(actor, "operations");
  z.number().int().positive().parse(version);
  return database().transaction(async (tx) => {
    const [o] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .for("update");
    if (!o) throw new BusinessError("NOT_FOUND", "订单不存在", 404);
    mustAccess(actor, o.customerId);
    if (o.version !== version)
      throw new BusinessError("STATE_CONFLICT", "订单已变化，请刷新");
    checkTransition(o.status, "start");
    if (o.status === "failed") {
      await activeCustomer(tx, o.customerId);
      const [q] = await tx
        .select()
        .from(quotes)
        .where(eq(quotes.id, o.quoteId));
      if (Date.parse(q.expiresAt) <= Date.now())
        throw new BusinessError("QUOTE_EXPIRED", "原报价已过期，请重新询价");
      const a = await lockedAccount(tx, o.customerId);
      if (new Decimal(available(a.balance, a.heldAmount)).lt(o.amount))
        throw new BusinessError("INSUFFICIENT_FUNDS", "客户可用余额不足");
      await tx
        .update(accounts)
        .set({ heldAmount: sql`${accounts.heldAmount}+${o.amount}::numeric` })
        .where(eq(accounts.id, a.id));
      await tx
        .update(holds)
        .set({ status: "held" })
        .where(eq(holds.orderId, id));
      await tx.insert(ledger).values({
        customerId: o.customerId,
        accountId: a.id,
        orderId: id,
        eventKey: `freeze:${id}:${version}`,
        type: "freeze",
        amount: o.amount,
        balanceDelta: "0.00",
        heldDelta: o.amount,
        actorId: actor.id,
      });
    }
    await tx
      .update(orders)
      .set({ status: "submitting", version: version + 1, assignedTo: actor.id })
      .where(eq(orders.id, id));
    await tx.insert(events).values({
      orderId: id,
      actorId: actor.id,
      event: "submitting",
      detail: "运营正在联系承运商处理订单。",
      visibility: "customer",
    });
    await auditAction(tx, actor, "order.start", o.customerId, id);
    return { id, status: "submitting", version: version + 1 };
  });
}
export async function recordResult(actor: Actor, id: string, input: unknown) {
  authorize(actor, "operations");
  const data = resultInput.parse(input);
  if (data.result === "failed" && !data.confirmedNoExternalOrder)
    throw new BusinessError(
      "EVIDENCE_REQUIRED",
      "拒单前须确认承运商未生成订单",
      422,
    );
  if (data.result === "accepted" && !data.externalId?.trim())
    throw new BusinessError("EVIDENCE_REQUIRED", "接单须填写承运商单号", 422);
  return database().transaction(async (tx) => {
    const [o] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .for("update");
    if (!o) throw new BusinessError("NOT_FOUND", "订单不存在", 404);
    mustAccess(actor, o.customerId);
    if (o.version !== data.expectedVersion)
      throw new BusinessError("STATE_CONFLICT", "订单已变化，请刷新");
    checkTransition(o.status, data.result);
    if (data.result !== "unknown") {
      const a = await lockedAccount(tx, o.customerId);
      const [h] = await tx
        .select()
        .from(holds)
        .where(eq(holds.orderId, id))
        .for("update");
      if (!h || h.status !== "held")
        throw new BusinessError("HOLD_CONFLICT", "订单冻结资金状态异常");
      const capture = data.result === "accepted";
      await tx
        .update(accounts)
        .set({
          heldAmount: sql`${accounts.heldAmount}-${o.amount}::numeric`,
          ...(capture
            ? { balance: sql`${accounts.balance}-${o.amount}::numeric` }
            : {}),
        })
        .where(eq(accounts.id, a.id));
      await tx
        .update(holds)
        .set({ status: capture ? "captured" : "released" })
        .where(eq(holds.id, h.id));
      await tx.insert(ledger).values({
        customerId: o.customerId,
        accountId: a.id,
        orderId: id,
        eventKey: `${capture ? "capture" : "release"}:${id}:${o.version}`,
        type: capture ? "capture" : "release",
        amount: o.amount,
        balanceDelta: capture ? `-${o.amount}` : "0.00",
        heldDelta: `-${o.amount}`,
        actorId: actor.id,
      });
    }
    await tx
      .update(orders)
      .set({
        status: data.result,
        version: o.version + 1,
        externalId: data.externalId ?? o.externalId,
        tracking: data.tracking ?? o.tracking,
      })
      .where(eq(orders.id, id));
    await tx.insert(events).values([
      {
        orderId: id,
        actorId: actor.id,
        event: data.result,
        detail:
          data.result === "accepted"
            ? "承运商已接单，冻结运费已扣款。"
            : data.result === "failed"
              ? "已确认拒单，冻结运费已释放。"
              : "承运商结果待核实，资金保持冻结。",
        visibility: "customer",
      },
      {
        orderId: id,
        actorId: actor.id,
        event: "evidence",
        detail: data.evidence,
        visibility: "internal",
      },
    ]);
    await auditAction(tx, actor, `order.${data.result}`, o.customerId, id);
    return { id, status: data.result, version: o.version + 1 };
  });
}
export async function updateFulfillment(
  actor: Actor,
  id: string,
  input: unknown,
) {
  authorize(actor, "operations");
  const d = z
    .object({
      expectedVersion: z.number().int().positive(),
      status: z.enum(["picked_up", "in_transit", "delivered"]),
      evidence: z.string().trim().min(2).max(2000),
    })
    .strict()
    .parse(input);
  return database().transaction(async (tx) => {
    const [o] = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .for("update");
    if (!o) throw new BusinessError("NOT_FOUND", "订单不存在", 404);
    mustAccess(actor, o.customerId);
    const stages = ["awaiting_pickup", "picked_up", "in_transit", "delivered"];
    if (
      o.status !== "accepted" ||
      o.version !== d.expectedVersion ||
      stages.indexOf(d.status) !== stages.indexOf(o.fulfillment) + 1
    )
      throw new BusinessError(
        "STATE_CONFLICT",
        "请按提货、运输、送达顺序更新状态",
      );
    await tx
      .update(orders)
      .set({ fulfillment: d.status, version: o.version + 1 })
      .where(eq(orders.id, id));
    await tx.insert(events).values({
      orderId: id,
      actorId: actor.id,
      event: d.status,
      detail: d.evidence,
      visibility: "customer",
    });
    await auditAction(tx, actor, "order.fulfillment", o.customerId, id);
    return { id };
  });
}
