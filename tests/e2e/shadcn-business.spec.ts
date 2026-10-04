import { test, expect, type Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

// Created by browser-fixtures.mjs with a guarded disposable development company.
// Invitations and carrier-result writes are intercepted: no email or money moves.
const fixturePath = ".env.browser-test.local";
const fixture = existsSync(fixturePath)
  ? JSON.parse(readFileSync(fixturePath, "utf8"))
  : null;
test.skip(
  !fixture,
  "Run scripts/browser-fixtures.mjs in local development first",
);
async function login(page: Page, identity: string) {
  await page.goto("/login");
  await page
    .getByLabel("邮箱")
    .fill(
      fixture.identities.find(
        (i: { identity: string }) => i.identity === identity,
      ).email,
    );
  await page.getByLabel("密码").fill("QA-Truckflow-Flow-2026-Only!");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page).toHaveURL(
    identity === "customer" ? /\/portal/ : /\/admin/,
    { timeout: 20000 },
  );
}

test("shadcn 询价控件保留地址、货物与服务选项的提交值", async ({ page }) => {
  await login(page, "customer");
  await page.goto("/portal/inquiry");
  for (const side of ["origin", "destination"]) {
    for (const [key, value] of Object.entries({
      name: "TEST 仓库",
      street: "123 Warehouse Street",
      city: "Los Angeles",
      state: "CA",
      postalCode: "90001",
      contact: "TEST 联系人",
      phone: "1234567890",
    })) {
      await page.locator(`[id="${side}.${key}"]`).fill(value);
    }
    await page.locator(`[id="${side}.type"]`).selectOption("commercial");
  }
  await page
    .locator("#pickupDate")
    .fill(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  await page.getByRole("button", { name: "下一步：货物与服务" }).click();
  for (const [key, value] of Object.entries({
    name: "TEST 配件",
    quantity: "2",
    weight: "100",
    length: "48",
    width: "40",
    height: "52",
  })) {
    await page.locator(`[id="goods.0.${key}"]`).fill(value);
  }
  await page.getByRole("checkbox", { name: "尾板服务" }).check();
  await page.getByRole("checkbox", { name: "预约送货" }).check();
  await page.getByRole("button", { name: "上一步", exact: true }).click();
  await expect(page.locator('[id="origin.street"]')).toHaveValue(
    "123 Warehouse Street",
  );
  await page.getByRole("button", { name: "下一步：货物与服务" }).click();
  await expect(page.getByRole("checkbox", { name: "尾板服务" })).toBeChecked();
  await page.getByRole("checkbox", { name: "预约送货" }).uncheck();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: ".impeccable/review/shadcn/customer-form-mobile.png",
    fullPage: true,
  });
  const request = page.waitForRequest(
    (r) => r.url().endsWith("/api/v1/inquiries") && r.method() === "POST",
  );
  await page.getByRole("button", { name: "提交询价", exact: true }).click();
  expect((await request).postDataJSON()).toMatchObject({
    services: ["liftgate"],
    goods: [{ quantity: 2, weight: "100" }],
  });
  await expect(page).toHaveURL(/\/portal\/inquiries\/[a-f0-9-]+/);
  await expect(page.getByText("TEST 配件", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: ".impeccable/review/shadcn/customer-inquiry-mobile.png",
    fullPage: true,
  });
});

test("shadcn 邀请权限复选框提交选中角色且重置后恢复默认", async ({ page }) => {
  test.setTimeout(60000);
  await login(page, "staff");
  await page.goto("/admin/customers");
  const row = page.getByRole("row").filter({ hasText: "TEST 浏览器验收客户" });
  await row.getByRole("link", { name: "查看客户" }).click();
  await page.getByRole("tab", { name: "成员账号" }).click();
  await page.getByRole("button", { name: "邀请成员" }).click();
  await page.getByLabel("账号姓名").fill("TEST 新成员");
  await page.getByLabel("登录邮箱").fill("ui-check@example.invalid");
  await page
    .getByRole("checkbox", { name: "财务：充值、余额、流水" })
    .uncheck();
  let payload: { roles: string[] } | undefined;
  await page.route(
    `**/api/v1/customers/${fixture.companyId}/invitations`,
    async (route) => {
      if (route.request().method() === "POST") {
        payload = route.request().postDataJSON();
        await route.fulfill({ json: { id: "ui-test-only" } });
      } else await route.continue();
    },
  );
  await page.getByRole("button", { name: "发送邀请邮件" }).click();
  await expect(page.getByText("邀请邮件已发送。", { exact: true })).toBeVisible(
    { timeout: 20000 },
  );
  expect(payload?.roles).toEqual(["customer_operator"]);
  await expect(
    page.getByRole("checkbox", { name: "财务：充值、余额、流水" }),
  ).toBeChecked();
});

test("shadcn 拒单确认保留必选校验和 FormData，分页按钮保留禁用状态", async ({
  page,
}) => {
  await login(page, "staff");
  const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const address = {
    name: "TEST 仓库",
    street: "123 Street",
    city: "LA",
    state: "CA",
    postalCode: "90001",
    contact: "TEST",
    phone: "1234567890",
    type: "commercial",
    timezone: "America/Los_Angeles",
  };
  const inquiry = {
    origin: address,
    destination: address,
    pickupDate: "2026-10-05",
    goods: [
      {
        name: "TEST 配件",
        quantity: 1,
        weight: "100",
        length: "48",
        width: "40",
        height: "52",
      },
    ],
    services: [],
    mode: "LTL",
    dangerous: false,
  };
  const order = {
    id,
    number: "TEST-SHADCN",
    customerId: fixture.companyId,
    amount: "360.00",
    status: "unknown",
    fulfillment: "awaiting_pickup",
    version: 2,
    snapshot: { inquiry, carrier: "TEST 承运商", fees: [] },
    externalId: null,
    tracking: null,
    createdAt: new Date().toISOString(),
    timeline: [],
    documents: [],
  };
  let payload: { confirmedNoExternalOrder: boolean } | undefined;
  await page.route(`**/api/v1/orders/${id}`, (r) => r.fulfill({ json: order }));
  await page.route(`**/api/v1/orders/${id}/result`, async (r) => {
    payload = r.request().postDataJSON();
    await r.fulfill({ json: order });
  });
  await page.goto(`/admin/orders/${id}`);
  await page.getByRole("button", { name: "处理订单", exact: true }).click();
  await page.getByLabel("承运商结果").selectOption("failed");
  await page
    .getByLabel("核实依据（内部可见）")
    .fill("TEST 承运商确认没有生成订单");
  await page.getByRole("button", { name: "记录处理结果" }).click();
  expect(payload).toBeUndefined();
  await page.getByRole("checkbox", { name: "已核实承运商未生成订单" }).check();
  await page.getByRole("button", { name: "记录处理结果" }).click();
  await expect.poll(() => payload?.confirmedNoExternalOrder).toBe(true);
  await page.goto("/admin/orders");
  await expect(page.getByRole("button", { name: "上一页" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "下一页" })).toBeDisabled();
});

test("shadcn 账号菜单与移动侧栏支持键盘退出和收起", async ({ page }) => {
  await login(page, "staff");
  await page.getByRole("button", { name: "账号菜单", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "退出登录" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("menuitem", { name: "退出登录" }),
  ).not.toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "切换导航", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "切换导航", exact: true }),
  ).toBeFocused();
});

test("冻结客户先确认，取消不写入，确认只提交一次", async ({ page }) => {
  await login(page, "staff");
  await page.goto("/admin/customers");
  const row = page.getByRole("row").filter({ hasText: "TEST 浏览器验收客户" });
  await row.getByRole("link", { name: "查看客户" }).click();
  let writes = 0;
  await page.route(
    `**/api/v1/customers/${fixture.companyId}`,
    async (route) => {
      if (route.request().method() === "PATCH") {
        writes++;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: fixture.companyId, status: "frozen" }),
        });
      } else await route.continue();
    },
  );
  await page.getByRole("button", { name: "冻结新业务" }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  expect(writes).toBe(0);
  await page.getByRole("button", { name: "取消", exact: true }).click();
  expect(writes).toBe(0);
  await page.getByRole("button", { name: "冻结新业务" }).click();
  await page.getByRole("button", { name: "确认冻结", exact: true }).click();
  await expect.poll(() => writes).toBe(1);
});

test("客户公司、成员账号和内部员工分别显示", async ({ page }) => {
  await login(page, "staff");
  await page.goto("/admin/staff");
  await expect(
    page.getByRole("heading", { name: "员工管理", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      fixture.identities.find(
        (i: { identity: string }) => i.identity === "staff",
      ).email,
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText(
      fixture.identities.find(
        (i: { identity: string }) => i.identity === "customer",
      ).email,
      { exact: true },
    ),
  ).toHaveCount(0);
  await page.goto("/admin/customers");
  await expect(
    page.getByRole("heading", { name: "客户管理", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("row")
    .filter({ hasText: "TEST 浏览器验收客户" })
    .getByRole("link", { name: "查看客户" })
    .click();
  await expect(page.getByRole("tab", { name: "客户资料" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("button", { name: "邀请成员" })).toHaveCount(0);
  await page.getByRole("tab", { name: "成员账号" }).click();
  await expect(
    page.getByText(
      fixture.identities.find(
        (i: { identity: string }) => i.identity === "customer",
      ).email,
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "邀请成员" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: ".impeccable/review/customer-members-mobile.png",
    fullPage: true,
  });
});
