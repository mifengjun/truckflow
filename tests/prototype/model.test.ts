import { describe, it, expect } from "vitest";
import {
  createInitialState,
  submitOrder,
  updateOrderResult,
  generateQuotes,
} from "../../src/modules/prototype/model";
const now = 1801560000000;
function quoted() {
  const s = createInitialState();
  s.quotes = generateQuotes(s.draft, now);
  return s;
}
describe("订单意图和报价快照", () => {
  it("同一提交意图只创建一单", () => {
    const s = quoted();
    const a = submitOrder(s, s.quotes[0].id, "intent-1", now);
    const b = submitOrder(a, s.quotes[0].id, "intent-1", now);
    expect(b.orders).toHaveLength(s.orders.length + 1);
  });
  it("修改草稿不会改变已下单地址", () => {
    const s = quoted();
    const a = submitOrder(s, s.quotes[0].id, "intent-1", now);
    a.draft.destination.address = "changed";
    expect(a.orders[0].draft.destination.address).toBe(
      "2200 Logistics Way, Dallas, TX 75201",
    );
  });
  it("拒绝过期和旧版本报价", () => {
    const s = quoted();
    expect(() => submitOrder(s, s.quotes[0].id, "x", now + 3600000)).toThrow();
    s.draft.revision++;
    expect(() => submitOrder(s, s.quotes[0].id, "y", now)).toThrow();
  });
  it("超时订单确认后保留订单号和历史", () => {
    const s = quoted();
    const a = submitOrder(s, s.quotes[0].id, "x", now);
    const id = a.orders[0].id;
    const b = updateOrderResult(a, id, "uncertain");
    const c = updateOrderResult(b, id, "accepted");
    expect(c.orders).toHaveLength(a.orders.length);
    expect(c.orders[0].id).toBe(id);
    expect(c.orders[0].events).toHaveLength(3);
    expect(c.orders[0].fulfillment).toBe("pickup");
    expect(updateOrderResult(c, id, "accepted").orders[0].events).toHaveLength(
      3,
    );
  });
});
it("同一毫秒的两个独立意图使用不同订单号", () => {
  const s = quoted();
  const a = submitOrder(s, s.quotes[0].id, "a", now);
  const b = submitOrder(a, s.quotes[0].id, "b", now);
  expect(b.orders[0].id).not.toBe(b.orders[1].id);
});
