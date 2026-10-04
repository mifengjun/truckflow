import Decimal from "decimal.js";
export class BusinessError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 409,
  ) {
    super(message);
  }
}
export type Role =
  | "customer_operator"
  | "customer_finance"
  | "operations"
  | "finance"
  | "admin"
  | "cost_view";
export type Actor = {
  id: string;
  name: string;
  identity: "customer" | "staff";
  customerId: string | null;
  roles: Role[];
  allCustomers: boolean;
  customerIds: string[];
};
export function money(value: string) {
  if (!/^(0|[1-9]\d{0,14})(\.\d{1,2})?$/.test(value))
    throw new BusinessError(
      "INVALID_MONEY",
      "金额须为非负数，最多两位小数",
      422,
    );
  return new Decimal(value).toFixed(2);
}
export function sumMoney(values: string[]) {
  return values
    .reduce((sum, value) => sum.plus(money(value)), new Decimal(0))
    .toFixed(2);
}
export function available(balance: string, held: string) {
  return new Decimal(balance).minus(held).toFixed(2);
}
export function authorize(actor: Actor, permission: Role, customerId?: string) {
  const mapped =
    actor.identity === "staff" && permission === "customer_operator"
      ? "operations"
      : actor.identity === "staff" && permission === "customer_finance"
        ? "finance"
        : permission;
  if (!actor.roles.includes(mapped))
    throw new BusinessError("FORBIDDEN", "没有执行此操作的权限", 403);
  if (
    customerId &&
    !(actor.identity === "customer"
      ? actor.customerId === customerId
      : actor.allCustomers || actor.customerIds.includes(customerId))
  )
    throw new BusinessError("NOT_FOUND", "记录不存在或不可访问", 404);
}
export function canAccess(actor: Actor, customerId: string) {
  return actor.identity === "customer"
    ? actor.customerId === customerId
    : actor.allCustomers || actor.customerIds.includes(customerId);
}
export function checkTransition(status: string, action: string) {
  const allowed =
    action === "start"
      ? ["pending_review", "failed"]
      : ["submitting", "unknown"];
  if (
    !allowed.includes(status) ||
    !["start", "accepted", "failed", "unknown"].includes(action)
  )
    throw new BusinessError("STATE_CONFLICT", "订单状态已变化，请刷新后处理");
}
export function homeForActor(actor: Actor) {
  if (actor.identity === "customer")
    return actor.roles.includes("customer_operator")
      ? "/portal/orders"
      : "/portal/finance";
  return actor.roles.includes("operations")
    ? "/admin/orders"
    : actor.roles.includes("finance")
      ? "/admin/settlement"
      : "/admin/customers";
}
