import { beforeAll, afterAll, it, expect } from "vitest";
import { createActors } from "../helpers/actors";
import { adminDb } from "../helpers/database";
import { completeOnboarding } from "@/modules/business/onboarding";
import {
  createInquiry,
  getInquiry,
  listInquiries,
  createQuote,
  publishQuote,
} from "@/modules/business/inquiries";
import { createOrder } from "@/modules/business/orders";
import { randomUUID } from "node:crypto";
let actors: Awaited<ReturnType<typeof createActors>>;
const companies: string[] = [];
beforeAll(async () => {
  actors = await createActors();
  for (const [index, key] of ["a", "b"].entries()) {
    const actor = key === "a" ? actors.a : actors.b;
    await adminDb`delete from app.profiles where id=${actor.id}`;
    const r = await completeOnboarding(
      { id: actor.id, email: actors.credentials[index].email },
      {
        companyName: "TEST SELF FLOW",
        contact: "TEST Contact",
        phone: "+86 13800000000",
      },
    );
    actor.customerId = r.customerId;
    companies.push(r.customerId);
  }
});
afterAll(async () => {
  if (actors) {
    for (const id of companies) {
      await adminDb`delete from app.audit_events where customer_id=${id}`;
      for (const table of [
        "orders",
        "quote_costs",
        "quotes",
        "inquiries",
        "accounts",
        "profiles",
      ])
        await adminDb.unsafe(
          `delete from app.${table} where customer_id=$1::uuid`,
          [id],
        );
      await adminDb`delete from app.customers where id=${id}`;
    }
    await actors.cleanup();
  }
  await adminDb.end();
});
it("shows self signup customer to operations while keeping quotes isolated", async () => {
  const address = {
    name: "TEST Warehouse",
    street: "1850 Warehouse Avenue",
    city: "Los Angeles",
    state: "CA",
    postalCode: "90021",
    contact: "TEST",
    phone: "5550100",
    type: "commercial" as const,
    timezone: "America/Los_Angeles" as const,
  };
  const inquiry = await createInquiry(actors.a, {
    origin: address,
    destination: address,
    mode: "LTL",
    pickupDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    goods: [
      {
        name: "TEST Goods",
        quantity: 1,
        weight: "100",
        length: "48",
        width: "40",
        height: "52",
      },
    ],
    services: [],
    dangerous: false,
  });
  const queue = await listInquiries(actors.staff);
  expect(queue.find((i) => i.id === inquiry.id)).toMatchObject({
    customerName: "TEST SELF FLOW",
    customerContact: "TEST Contact",
    customerSource: "self_signup",
  });
  const quote = await createQuote(actors.staff, inquiry.id, {
    carrier: "TEST Carrier",
    fees: [{ label: "运费", amount: "360.00" }],
    cost: "300.00",
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    transit: "参考 3–5 日",
    evidence: "TEST source",
  });
  await publishQuote(actors.staff, quote.id);
  expect((await getInquiry(actors.a, inquiry.id)).quotes).toHaveLength(1);
  await expect(getInquiry(actors.b, inquiry.id)).rejects.toMatchObject({
    status: 404,
  });
  await expect(
    createOrder(actors.a, quote.id, randomUUID()),
  ).rejects.toMatchObject({ code: "INSUFFICIENT_FUNDS" });
});
