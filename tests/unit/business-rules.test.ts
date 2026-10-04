import { describe, expect, it } from "vitest";
import {
  available,
  sumMoney,
  authorize,
  checkTransition,
  type Actor,
} from "@/modules/business/rules";
describe("business boundaries", () => {
  it("calculates exact decimal funds without binary rounding", () => {
    expect(sumMoney(["0.10", "0.20"])).toBe("0.30");
    expect(available("1000.00", "560.00")).toBe("440.00");
    expect(() => sumMoney(["-1.00"])).toThrow();
    expect(() => sumMoney(["1.001"])).toThrow();
  });
  const customer: Actor = {
    id: "a",
    name: "A",
    identity: "customer",
    customerId: "company-a",
    roles: ["customer_operator"],
    allCustomers: false,
    customerIds: [],
  };
  it("rejects cross-customer ids and staff operations", () => {
    expect(() =>
      authorize(customer, "customer_operator", "company-a"),
    ).not.toThrow();
    expect(() =>
      authorize(customer, "customer_operator", "company-b"),
    ).toThrow();
    expect(() => authorize(customer, "operations", "company-a")).toThrow();
  });
  it("does not grant finance privileges to an admin automatically", () => {
    const actor: Actor = {
      ...customer,
      identity: "staff",
      customerId: null,
      roles: ["admin"],
      allCustomers: true,
    };
    expect(() => authorize(actor, "finance", "company-a")).toThrow();
    expect(() => authorize(actor, "admin")).not.toThrow();
  });
  it("only allows unknown results to be reconciled, never restarted", () => {
    expect(() => checkTransition("unknown", "start")).toThrow();
    expect(() => checkTransition("unknown", "accepted")).not.toThrow();
    expect(() => checkTransition("accepted", "failed")).toThrow();
  });
});
