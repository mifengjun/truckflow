import { it, expect } from "vitest";
import { loadState } from "../../src/modules/prototype/storage";
import { createInitialState } from "../../src/modules/prototype/model";
it("损坏和不兼容存储恢复默认，合法草稿保留", () => {
  for (const raw of ["{broken", "{}", '{"version":1,"orders":[]}'])
    expect(loadState(raw).draft.destination.address).toBe(
      "2200 Logistics Way, Dallas, TX 75201",
    );
  const s = createInitialState();
  s.draft.destination.address = "客户修改地址";
  expect(loadState(JSON.stringify(s)).draft.destination.address).toBe(
    "客户修改地址",
  );
});
it("未填完的数字字段刷新后不会清空已填写地址与订单", () => {
  const s = createInitialState();
  s.draft.destination.address = "客户保留地址";
  s.draft.goods[0].weight = NaN;
  const restored = loadState(JSON.stringify(s));
  expect(restored.draft.destination.address).toBe("客户保留地址");
  expect(restored.draft.goods[0].weight).toBe(0);
  expect(restored.orders).toHaveLength(7);
});
it("非法订单或事件时间触发完整恢复，避免日期格式化崩溃", () => {
  for (const mutate of [
    (s: ReturnType<typeof createInitialState>) => {
      s.orders[0].createdAt = "invalid";
    },
    (s: ReturnType<typeof createInitialState>) => {
      s.orders[0].events[0].at = "not-a-date";
    },
  ]) {
    const s = createInitialState();
    s.draft.destination.address = "应被恢复";
    mutate(s);
    expect(loadState(JSON.stringify(s)).draft.destination.address).toBe(
      "2200 Logistics Way, Dallas, TX 75201",
    );
  }
});
