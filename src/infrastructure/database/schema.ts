import {
  pgSchema,
  uuid,
  text,
  boolean,
  jsonb,
  numeric,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import type { InquiryInput, AddressInput } from "@/modules/business/contracts";
import type { Role } from "@/modules/business/rules";
import { sql } from "drizzle-orm";
export const app = pgSchema("app");
const id = () => uuid("id").primaryKey().defaultRandom();
const created = () =>
  timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow();
const amount = (name: string) =>
  numeric(name, { precision: 18, scale: 2 }).notNull();
export const customers = app.table("customers", {
  id: id(),
  name: text().notNull(),
  contact: text().notNull(),
  email: text().notNull(),
  phone: text().notNull(),
  status: text().notNull().default("active"),
  source: text()
    .$type<"admin_created" | "self_signup">()
    .notNull()
    .default("admin_created"),
  createdAt: created(),
});
export const profiles = app.table("profiles", {
  id: uuid().primaryKey(),
  name: text().notNull(),
  identity: text().$type<"customer" | "staff">().notNull(),
  customerId: uuid("customer_id"),
  active: boolean().notNull().default(true),
  roles: text().array().$type<Role[]>().notNull(),
  allCustomers: boolean("all_customers").notNull().default(false),
  createdAt: created(),
});
export const staffAccess = app.table("staff_customer_access", {
  staffId: uuid("staff_id").notNull(),
  customerId: uuid("customer_id").notNull(),
});
export const invitations = app.table("invitations", {
  id: id(),
  customerId: uuid("customer_id").notNull(),
  email: text().notNull(),
  name: text().notNull(),
  roles: text().array().$type<Role[]>().notNull(),
  status: text().notNull().default("pending"),
  userId: uuid("user_id"),
  createdBy: uuid("created_by").notNull(),
  errorCode: text("error_code"),
  createdAt: created(),
});
export const addresses = app.table("addresses", {
  id: id(),
  customerId: uuid("customer_id"),
  scope: text().notNull().default("private"),
  data: jsonb().$type<AddressInput>().notNull(),
  version: integer().notNull().default(1),
  archivedAt: timestamp("archived_at", { withTimezone: true, mode: "string" }),
  createdAt: created(),
});
export const inquiries = app.table("inquiries", {
  id: id(),
  number: text()
    .notNull()
    .default(sql`'INQ-'||lpad(nextval('app.inquiry_number')::text,8,'0')`),
  customerId: uuid("customer_id").notNull(),
  createdBy: uuid("created_by").notNull(),
  data: jsonb().$type<InquiryInput>().notNull(),
  version: integer().notNull().default(1),
  status: text().notNull().default("pending"),
  reason: text(),
  createdAt: created(),
});
export const quotes = app.table("quotes", {
  id: id(),
  inquiryId: uuid("inquiry_id").notNull(),
  customerId: uuid("customer_id").notNull(),
  carrier: text().notNull(),
  fees: jsonb().$type<{ label: string; amount: string }[]>().notNull(),
  amount: amount("amount"),
  currency: text().notNull().default("USD"),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
  transit: text().notNull(),
  evidence: text().notNull(),
  status: text().notNull().default("draft"),
  createdBy: uuid("created_by").notNull(),
  publishedAt: timestamp("published_at", {
    withTimezone: true,
    mode: "string",
  }),
  createdAt: created(),
});
export const quoteCosts = app.table("quote_costs", {
  quoteId: uuid("quote_id").primaryKey(),
  customerId: uuid("customer_id").notNull(),
  amount: amount("amount"),
});
export const accounts = app.table("accounts", {
  id: id(),
  customerId: uuid("customer_id").notNull(),
  currency: text().notNull().default("USD"),
  balance: amount("balance").default("0"),
  heldAmount: amount("held_amount").default("0"),
});
export type OrderSnapshot = {
  inquiry: InquiryInput;
  carrier: string;
  fees: { label: string; amount: string }[];
  amount: string;
  currency: "USD";
  transit: string;
};
export const orders = app.table("orders", {
  id: id(),
  number: text()
    .notNull()
    .default(sql`'TF-'||lpad(nextval('app.order_number')::text,8,'0')`),
  customerId: uuid("customer_id").notNull(),
  inquiryId: uuid("inquiry_id").notNull(),
  quoteId: uuid("quote_id").notNull(),
  snapshot: jsonb().$type<OrderSnapshot>().notNull(),
  amount: amount("amount"),
  currency: text().notNull().default("USD"),
  status: text().notNull().default("pending_review"),
  fulfillment: text().notNull().default("awaiting_pickup"),
  version: integer().notNull().default(1),
  createdBy: uuid("created_by").notNull(),
  assignedTo: uuid("assigned_to"),
  externalId: text("external_id"),
  tracking: text(),
  createdAt: created(),
});
export const idempotency = app.table("idempotency_records", {
  customerId: uuid("customer_id").notNull(),
  operation: text().notNull(),
  key: text().notNull(),
  payloadHash: text("payload_hash").notNull(),
  orderId: uuid("order_id").notNull(),
  createdAt: created(),
});
export const holds = app.table("fund_holds", {
  id: id(),
  customerId: uuid("customer_id").notNull(),
  accountId: uuid("account_id").notNull(),
  orderId: uuid("order_id").notNull(),
  amount: amount("amount"),
  status: text().notNull().default("held"),
});
export const attachments = app.table("attachments", {
  id: id(),
  customerId: uuid("customer_id").notNull(),
  orderId: uuid("order_id"),
  kind: text().notNull(),
  filename: text().notNull(),
  storagePath: text("storage_path").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  customerVisible: boolean("customer_visible").notNull().default(true),
  createdBy: uuid("created_by").notNull(),
  createdAt: created(),
});
export const recharges = app.table("recharge_requests", {
  id: id(),
  customerId: uuid("customer_id").notNull(),
  amount: amount("amount"),
  reference: text().notNull(),
  proofId: uuid("proof_id").notNull(),
  status: text().notNull().default("pending"),
  receivedAmount: numeric("received_amount", { precision: 18, scale: 2 }),
  bankReference: text("bank_reference"),
  reason: text(),
  version: integer().notNull().default(1),
  verifiedBy: uuid("verified_by"),
  createdBy: uuid("created_by").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true, mode: "string" }),
  createdAt: created(),
});
export const ledger = app.table("ledger_entries", {
  id: id(),
  customerId: uuid("customer_id").notNull(),
  accountId: uuid("account_id").notNull(),
  orderId: uuid("order_id"),
  rechargeId: uuid("recharge_id"),
  eventKey: text("event_key").notNull(),
  type: text().notNull(),
  amount: amount("amount"),
  balanceDelta: amount("balance_delta"),
  heldDelta: amount("held_delta"),
  actorId: uuid("actor_id").notNull(),
  createdAt: created(),
});
export const events = app.table("order_events", {
  id: id(),
  orderId: uuid("order_id").notNull(),
  actorId: uuid("actor_id").notNull(),
  event: text().notNull(),
  detail: text().notNull(),
  visibility: text().notNull(),
  createdAt: created(),
});
export const audit = app.table("audit_events", {
  id: id(),
  actorId: uuid("actor_id").notNull(),
  customerId: uuid("customer_id"),
  action: text().notNull(),
  resourceId: uuid("resource_id"),
  createdAt: created(),
});
export const rateLimits = app.table("rate_limits", {
  key: text().primaryKey(),
  windowStart: timestamp("window_start", {
    withTimezone: true,
    mode: "string",
  }).notNull(),
  hits: integer().notNull(),
});
