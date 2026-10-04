import { test, expect } from "@playwright/test";
test("客户修改资料并将真实输入带到确认页", async ({ page }) => {
  await page.goto("/prototype/portal/inquiry");
  await page
    .getByRole("textbox", { name: "完整收货地址", exact: true })
    .fill(
      "Building 12, Receiving Dock B, 2200 International Logistics Boulevard, Dallas, TX 75201",
    );
  await page.getByRole("button", { name: "下一步：填写货物" }).click();
  await page.getByRole("button", { name: "添加一种货物" }).click();
  await page
    .getByRole("textbox", { name: "品名 2", exact: true })
    .fill("办公桌配件");
  await page.getByRole("button", { name: "返回收发货" }).click();
  await expect(
    page.getByRole("textbox", { name: "完整收货地址", exact: true }),
  ).toHaveValue(/Building 12/);
  await page.getByRole("button", { name: "下一步：填写货物" }).click();
  await page.getByRole("button", { name: "获取承运商报价" }).click();
  await page.getByRole("link", { name: "选择报价" }).first().click();
  await expect(page.getByText("办公桌配件", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "确认提交订单" }),
  ).toBeDisabled();
});
test("后台超时核实后客户可见同一订单状态，刷新与返回保留筛选", async ({
  page,
}) => {
  await page.goto("/prototype/admin/orders?status=pending&q=1078");
  await page
    .getByRole("link", { name: "处理订单 TF-261004-1078", exact: true })
    .click();
  await expect(page).toHaveURL(/\/prototype\/admin\/orders\/TF-261004-1078/);
  await page
    .getByRole("combobox", { name: "评审场景" })
    .selectOption("carrier-timeout");
  await page
    .getByRole("checkbox", { name: "已核对运输资料与承运结果" })
    .check();
  await page
    .getByRole("textbox", { name: "内部处理备注" })
    .fill("内部核验备注");
  await page.getByRole("button", { name: "审核并提交承运商" }).click();
  await page.getByRole("button", { name: "已核实：确认接单" }).click();
  await expect(page.getByText("承运商已确认", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "客户视角", exact: true }).click();
  await expect(page.getByText("内部核验备注", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByText("确认承运商已接单", { exact: true }),
  ).toBeVisible();
});
test("重新打开已提交的确认链接只提供原订单，不重复下单", async ({ page }) => {
  await page.goto("/prototype/portal/quotes?request=1");
  await page
    .getByRole("link", { name: "选择报价", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/prototype\/portal\/confirm\?quote=/);
  const confirmation = page.url();
  await page
    .getByRole("checkbox", { name: "我已核对收发货资料、货物和报价" })
    .check();
  await page.getByRole("button", { name: "确认提交订单" }).click();
  await expect(
    page.getByRole("heading", { name: "订单摘要", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/prototype\/portal\/orders\//);
  const order = page.url();
  await page.goto(confirmation);
  await expect(page.getByRole("button", { name: "确认提交订单" })).toHaveCount(
    0,
  );
  await page.getByRole("link", { name: "查看已创建订单", exact: true }).click();
  await expect(page).toHaveURL(order);
});
