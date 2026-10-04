import { beforeAll, afterAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { adminDb } from "../helpers/database";
import { createActors } from "../helpers/actors";
import {
  createInquiry,
  getInquiry,
  createQuote,
  publishQuote,
} from "@/modules/business/inquiries";
import {
  createOrder,
  startOrder,
  recordResult,
  getOrder,
  updateFulfillment,
} from "@/modules/business/orders";
import {
  createRecharge,
  verifyRecharge,
  getAccount,
} from "@/modules/business/finance";
let actors: Awaited<ReturnType<typeof createActors>>;
const address = {
  name: "TEST Warehouse",
  street: "1850 Warehouse Avenue, Complete long address",
  city: "Los Angeles",
  state: "CA",
  postalCode: "90021",
  contact: "QA",
  phone: "5550100",
  type: "commercial" as const,
  timezone: "America/Los_Angeles" as const,
};
beforeAll(async () => {
  actors = await createActors();
});
afterAll(async () => {
  if (actors) await actors.cleanup();
  await adminDb.end();
});
async function quoted() {
  const inquiry = await createInquiry(actors.a, {
    origin: address,
    destination: address,
    mode: "LTL",
    pickupDate: new Intl.DateTimeFormat("en-CA", {
      timeZone: address.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(Date.now() + 7 * 86400000)),
    goods: [
      {
        name: "TEST Boxes",
        quantity: 2,
        weight: "680",
        length: "48",
        width: "40",
        height: "52",
      },
    ],
    services: [],
    dangerous: false,
  });
  const quote = await createQuote(actors.staff, inquiry.id, {
    carrier: "TEST Manual carrier",
    fees: [{ label: "运费", amount: "360.00" }],
    cost: "300.00",
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    transit: "参考 3–5 日",
    evidence: "TEST manual quote source",
  });
  await publishQuote(actors.staff, quote.id);
  return { inquiry, quote };
}
it("keeps customer isolation and hides carrier costs", async () => {
  const { inquiry } = await quoted();
  await expect(getInquiry(actors.b, inquiry.id)).rejects.toMatchObject({
    status: 404,
  });
  const dto = await getInquiry(actors.a, inquiry.id);
  expect(JSON.stringify(dto)).not.toContain("300.00");
  expect(dto.quotes).toHaveLength(1);
});
it("rejects unaffordable orders without storing a partial order", async () => {
  const { quote } = await quoted();
  await expect(
    createOrder(actors.a, quote.id, randomUUID()),
  ).rejects.toMatchObject({ code: "INSUFFICIENT_FUNDS" });
  expect(
    (await adminDb`select id from app.orders where quote_id=${quote.id}`)
      .length,
  ).toBe(0);
});
it("verifies recharge once, freezes once, retains unknown holds and captures once", async () => {
  const proofId = randomUUID();
  await adminDb`insert into app.attachments(id,customer_id,kind,filename,storage_path,mime_type,size_bytes,created_by) values(${proofId},${actors.a.customerId!},'recharge_proof','TEST.pdf',${randomUUID()},'application/pdf',10,${actors.a.id})`;
  const request = await createRecharge(actors.a, {
    amount: "1000.00",
    reference: "TEST Transfer",
    proofId,
  });
  const payload = {
    expectedVersion: 1,
    amount: "1000.00",
    bankReference: randomUUID(),
    reason: "TEST verified transfer",
  };
  await verifyRecharge(actors.staff, request.id, payload);
  await expect(
    verifyRecharge(actors.staff, request.id, payload),
  ).rejects.toMatchObject({ status: 409 });
  expect((await getAccount(actors.a)).balance).toBe("1000.00");
  const { quote } = await quoted(),
    key = randomUUID();
  const order = await createOrder(actors.a, quote.id, key);
  expect((await createOrder(actors.a, quote.id, key)).id).toBe(order.id);
  expect((await getAccount(actors.a)).heldAmount).toBe("360.00");
  await startOrder(actors.staff, order.id, 1);
  await recordResult(actors.staff, order.id, {
    expectedVersion: 2,
    result: "unknown",
    evidence: "TEST result unknown",
  });
  await expect(startOrder(actors.staff, order.id, 3)).rejects.toMatchObject({
    code: "STATE_CONFLICT",
  });
  expect((await getAccount(actors.a)).heldAmount).toBe("360.00");
  await recordResult(actors.staff, order.id, {
    expectedVersion: 3,
    result: "accepted",
    externalId: "TEST-EXTERNAL-1",
    evidence: "TEST accepted evidence",
  });
  await expect(
    recordResult(actors.staff, order.id, {
      expectedVersion: 3,
      result: "accepted",
      externalId: "TEST-EXTERNAL-1",
      evidence: "duplicate",
    }),
  ).rejects.toMatchObject({ status: 409 });
  const account = await getAccount(actors.a);
  expect(account.balance).toBe("640.00");
  expect(account.heldAmount).toBe("0.00");
  await expect(getOrder(actors.b, order.id)).rejects.toMatchObject({
    status: 404,
  });
});
it("rejects only once and releases the original hold", async () => {
  const { quote } = await quoted();
  const order = await createOrder(actors.a, quote.id, randomUUID());
  await startOrder(actors.staff, order.id, 1);
  await expect(
    recordResult(actors.staff, order.id, {
      expectedVersion: 2,
      result: "failed",
      evidence: "TEST rejection",
    }),
  ).rejects.toMatchObject({ code: "EVIDENCE_REQUIRED" });
  await recordResult(actors.staff, order.id, {
    expectedVersion: 2,
    result: "failed",
    evidence: "TEST confirmed no external order",
    confirmedNoExternalOrder: true,
  });
  expect((await getAccount(actors.a)).balance).toBe("640.00");
  expect((await getAccount(actors.a)).heldAmount).toBe("0.00");
});
it("prevents concurrent orders from occupying more than available funds", async () => {
  const first = await quoted(),
    second = await quoted();
  const results = await Promise.allSettled([
    createOrder(actors.a, first.quote.id, randomUUID()),
    createOrder(actors.a, second.quote.id, randomUUID()),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect((await getAccount(actors.a)).available).toBe("280.00");
});
it("rejects expired quotes and idempotency key reuse with a different quote", async () => {
  const expired = await quoted();
  await adminDb`update app.quotes set expires_at=now()-interval '1 minute' where id=${expired.quote.id}`;
  await expect(
    createOrder(actors.a, expired.quote.id, randomUUID()),
  ).rejects.toMatchObject({ code: "QUOTE_EXPIRED" });
  const x = await quoted(),
    y = await quoted();
  for (const q of [x.quote, y.quote])
    await adminDb`update app.quotes set amount=10,fees='[{"label":"TEST","amount":"10.00"}]'::jsonb where id=${q.id}`;
  const key = randomUUID();
  await createOrder(actors.a, x.quote.id, key);
  await expect(createOrder(actors.a, y.quote.id, key)).rejects.toMatchObject({
    code: "IDEMPOTENCY_CONFLICT",
  });
});
it("blocks new business for a frozen customer", async () => {
  const { quote } = await quoted();
  await adminDb`update app.customers set status='frozen' where id=${actors.a.customerId!}`;
  try {
    await expect(
      createOrder(actors.a, quote.id, randomUUID()),
    ).rejects.toMatchObject({ code: "CUSTOMER_FROZEN" });
  } finally {
    await adminDb`update app.customers set status='active' where id=${actors.a.customerId!}`;
  }
});

it("re-freezes a confirmed failed attempt and completes fulfillment without double capture", async () => {
  const { quote } = await quoted();
  await adminDb`update app.quotes set amount=10,fees='[{"label":"TEST","amount":"10.00"}]'::jsonb where id=${quote.id}`;
  const o = await createOrder(actors.a, quote.id, randomUUID());
  await startOrder(actors.staff, o.id, 1);
  await recordResult(actors.staff, o.id, {
    expectedVersion: 2,
    result: "failed",
    evidence: "TEST confirmed rejection",
    confirmedNoExternalOrder: true,
  });
  await startOrder(actors.staff, o.id, 3);
  await recordResult(actors.staff, o.id, {
    expectedVersion: 4,
    result: "accepted",
    externalId: "TEST-RETRY",
    evidence: "TEST retry accepted",
  });
  await expect(
    updateFulfillment(actors.staff, o.id, {
      expectedVersion: 5,
      status: "delivered",
      evidence: "TEST skipped stage",
    }),
  ).rejects.toMatchObject({ code: "STATE_CONFLICT" });
  for (const [version, status] of [
    [5, "picked_up"],
    [6, "in_transit"],
    [7, "delivered"],
  ])
    await updateFulfillment(actors.staff, o.id, {
      expectedVersion: version,
      status,
      evidence: "TEST transport progress",
    });
  expect((await getOrder(actors.a, o.id)).fulfillment).toBe("delivered");
  const [invariant] =
    await adminDb`select a.balance=coalesce(sum(l.balance_delta),0) as balance_ok,a.held_amount=coalesce(sum(l.held_delta),0) as holds_ok from app.accounts a left join app.ledger_entries l on l.account_id=a.id where a.customer_id=${actors.a.customerId!} group by a.id`;
  expect(invariant.balance_ok).toBe(true);
  expect(invariant.holds_ok).toBe(true);
});
