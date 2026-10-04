import { expect, it } from "vitest";
import { inquiryInput, quoteInput } from "@/modules/business/contracts";
it("rejects impossible dates, unsupported modes and empty cargo", () => {
  const address = {
    name: "仓库",
    street: "123 Full Street",
    city: "Los Angeles",
    state: "CA",
    postalCode: "90021",
    contact: "Alex",
    phone: "12345678",
    type: "commercial",
    timezone: "America/Los_Angeles",
  };
  const input = {
    origin: address,
    destination: address,
    pickupDate: "2026-02-30",
    goods: [],
    services: [],
    mode: "FTL",
  };
  expect(inquiryInput.safeParse(input).success).toBe(false);
  expect(
    inquiryInput.safeParse({
      ...input,
      mode: "LTL",
      pickupDate: "2026-10-08",
      goods: [
        {
          name: "Boxes",
          quantity: 2,
          weight: "680",
          length: "48",
          width: "40",
          height: "52",
        },
      ],
    }).success,
  ).toBe(true);
});
it("rejects fractional cent prices and missing quotation validity", () => {
  expect(
    quoteInput.safeParse({
      carrier: "Carrier",
      fees: [{ label: "运费", amount: "12.345" }],
      cost: "10",
      expiresAt: "",
      transit: "参考时效",
      evidence: "人工报价",
    }).success,
  ).toBe(false);
});
