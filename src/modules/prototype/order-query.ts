import type { PrototypeOrder } from "./model";
export function filterOrders(
  orders: PrototypeOrder[],
  params: URLSearchParams,
) {
  const q = (params.get("q") || "").trim().toLowerCase(),
    status = params.get("status") || "all",
    date = params.get("date");
  return orders.filter((o) => {
    const local = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Los_Angeles",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(o.createdAt));
    return (
      (!q ||
        [o.id, o.tracking, o.draft.reference, o.draft.customer].some((v) =>
          v.toLowerCase().includes(q),
        )) &&
      (status === "all" || o.result === status || o.fulfillment === status) &&
      (!date || local === date)
    );
  });
}
