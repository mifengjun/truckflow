import type { InquiryInput, AddressInput } from "@/modules/business/contracts";
import type { OrderSnapshot } from "@/infrastructure/database/schema";
export type Quote = {
  id: string;
  carrier: string;
  fees: { label: string; amount: string }[];
  amount: string;
  currency: string;
  expiresAt: string;
  transit: string;
  status: string;
};
export type Inquiry = {
  id: string;
  number: string;
  customerId: string;
  data: InquiryInput;
  status: string;
  reason: string | null;
  createdAt: string;
  quotes: Quote[];
  order: { id: string; number: string } | null;
};
export type Order = {
  id: string;
  number: string;
  customerId: string;
  amount: string;
  status: string;
  fulfillment: string;
  version: number;
  snapshot: OrderSnapshot;
  externalId: string | null;
  tracking: string | null;
  createdAt: string;
  timeline: {
    id: string;
    event: string;
    detail: string;
    createdAt: string;
    visibility: string;
  }[];
  documents: {
    id: string;
    kind: string;
    filename: string;
    createdAt: string;
  }[];
};
export type Address = {
  id: string;
  scope: string;
  data: AddressInput;
  version: number;
};
export type Recharge = {
  id: string;
  customerId: string;
  amount: string;
  receivedAmount: string | null;
  reference: string;
  proofId: string;
  status: string;
  reason: string | null;
  version: number;
  createdAt: string;
};
export type Customer = {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  status: string;
};
