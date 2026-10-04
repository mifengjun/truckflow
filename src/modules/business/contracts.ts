import { z } from "zod";
const text = z.string().trim().min(1, "请填写此项").max(500);
export const moneyInput = z
  .string()
  .regex(/^(0|[1-9]\d{0,14})(\.\d{1,2})?$/, "金额最多两位小数");
const positive = z
  .string()
  .regex(/^\d+(\.\d{1,3})?$/, "请填写正数")
  .refine(
    (v) => Number(v) > 0 && Number(v) <= 1000000,
    "须大于零且不超过 1,000,000",
  );
export const addressInput = z
  .object({
    name: text,
    street: z.string().trim().min(1).max(2000),
    city: text,
    state: z.string().regex(/^[A-Z]{2}$/, "州须为两位大写代码"),
    postalCode: z.string().regex(/^\d{5}(-\d{4})?$/, "请输入美国邮编"),
    contact: text,
    phone: text,
    type: z.enum(["commercial", "residential"]),
    timezone: z.enum([
      "America/Los_Angeles",
      "America/Denver",
      "America/Chicago",
      "America/New_York",
      "America/Phoenix",
      "America/Anchorage",
      "Pacific/Honolulu",
    ]),
  })
  .strict();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    "请输入有效日期",
  );
export const inquiryInput = z
  .object({
    origin: addressInput,
    destination: addressInput,
    pickupDate: date,
    mode: z.literal("LTL"),
    goods: z
      .array(
        z.object({
          name: text,
          sku: z.string().max(100).optional(),
          quantity: z.number().int().min(1).max(1000000),
          weight: positive,
          length: positive,
          width: positive,
          height: positive,
        }),
      )
      .min(1)
      .max(30),
    services: z.array(z.enum(["liftgate", "appointment", "inside"])).max(3),
    reference: z.string().max(100).optional(),
    notes: z.string().max(2000).optional(),
    dangerous: z.literal(false).default(false),
  })
  .strict();
export const quoteInput = z
  .object({
    carrier: text,
    fees: z
      .array(z.object({ label: text, amount: moneyInput }))
      .min(1)
      .max(20),
    cost: moneyInput,
    expiresAt: z.iso.datetime({ offset: true }),
    transit: text,
    evidence: z.string().trim().min(2).max(2000),
  })
  .strict();
export const customerInput = z
  .object({ name: text, contact: text, email: z.email(), phone: text })
  .strict();
export const rechargeInput = z
  .object({
    amount: moneyInput.refine((v) => Number(v) > 0),
    reference: text,
    proofId: z.uuid(),
  })
  .strict();
export const resultInput = z
  .object({
    expectedVersion: z.number().int().positive(),
    result: z.enum(["accepted", "failed", "unknown"]),
    evidence: text,
    externalId: z.string().trim().max(200).optional(),
    tracking: z.string().trim().max(200).optional(),
    confirmedNoExternalOrder: z.boolean().optional(),
  })
  .strict();
export type InquiryInput = z.infer<typeof inquiryInput>;
export type AddressInput = z.infer<typeof addressInput>;
