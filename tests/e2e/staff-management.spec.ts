import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
const fixture = existsSync(".env.browser-test.local")
  ? JSON.parse(readFileSync(".env.browser-test.local", "utf8"))
  : null;
test.skip(!fixture, "Create disposable browser fixtures first");
test("员工新增、编辑范围、邀请重试与停用确认", async ({ page }) => {
  test.setTimeout(90000);
  const staff = fixture.identities.find(
    (p: { identity: string }) => p.identity === "staff",
  );
  await page.goto("/login");
  await page.getByLabel("邮箱").fill(staff.email);
  await page.getByLabel("密码").fill("QA-Truckflow-Flow-2026-Only!");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\//, { timeout: 20000 });
  const employeeId = "00000000-0000-4000-8000-000000000001";
  const customer = { id: fixture.companyId, name: "TEST 浏览器验收客户" };
  let employee: Record<string, unknown> | null = null;
  const creations: Record<string, unknown>[] = [],
    updates: Record<string, unknown>[] = [];
  let resends = 0,
    detailLoads = 0;
  // Intercept writes and directory data: no outgoing mail or real permission changes.
  await page.route("**/api/v1/staff**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    let body: unknown;
    if (path.endsWith("customer-options"))
      body = { items: [customer], hasMore: false };
    else if (path.endsWith("invitations")) body = { items: [], hasMore: false };
    else if (path.endsWith("/invite")) {
      resends++;
      employee = { ...employee, invitationStatus: "sent" };
      body = { status: "sent", message: "设置密码邮件已发送。" };
    } else if (request.method() === "POST") {
      const data = request.postDataJSON();
      creations.push(data);
      employee = {
        ...data,
        id: employeeId,
        active: true,
        version: 1,
        invitationStatus: "failed",
      };
      body = {
        status: "failed",
        message: "员工邀请未完成，记录已保留，请在列表中重试。",
      };
    } else if (request.method() === "PATCH") {
      const data = request.postDataJSON();
      updates.push(data);
      if (data.expectedVersion !== employee?.version) {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            message: "此员工资料已更新，请刷新列表后重试",
          }),
        });
        return;
      }
      employee = { ...employee, ...data, version: data.expectedVersion + 1 };
      body = { ...employee, destination: null };
    } else if (path.endsWith(employeeId)) {
      detailLoads++;
      body = {
        ...employee,
        assigned: employee?.allCustomers ? [] : [customer],
      };
    } else body = { items: employee ? [employee] : [], hasMore: false };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  await page.goto("/admin/staff");
  await page.getByRole("button", { name: "新增员工", exact: true }).click();
  let panel = page.getByRole("dialog");
  await panel.getByLabel("员工姓名").fill("TEST 新员工");
  await panel.getByLabel("员工邮箱").fill("employee@example.invalid");
  await panel
    .getByRole("checkbox", { name: customer.name, exact: true })
    .check();
  await panel.getByRole("checkbox", { name: "成本查看", exact: true }).check();
  await panel.getByRole("button", { name: "创建并发送邀请" }).click();
  await expect(panel).not.toBeVisible();
  expect(creations).toEqual([
    {
      name: "TEST 新员工",
      email: "employee@example.invalid",
      roles: ["operations", "cost_view"],
      allCustomers: false,
      customerIds: [customer.id],
    },
  ]);
  await expect(page.getByRole("status")).toContainText("记录已保留");
  await page.getByRole("button", { name: "重新发送邀请" }).click();
  await expect(page.getByRole("status")).toContainText("设置密码邮件已发送");
  expect(resends).toBe(1);
  await page.getByRole("button", { name: "编辑权限" }).click();
  panel = page.getByRole("dialog");
  await expect(panel.getByLabel("员工姓名")).toHaveValue("TEST 新员工");
  await panel.getByRole("checkbox", { name: "运营", exact: true }).uncheck();
  await panel.getByRole("checkbox", { name: "财务", exact: true }).check();
  await panel
    .getByRole("radio", { name: "全部客户（包含今后新增客户）" })
    .check();
  // Refetch after another administrator updates this account. The local edit must retain v1.
  employee = Object.assign({}, employee, {
    name: "TEST 同事已更新",
    roles: ["admin"],
    version: 2,
  });
  const beforeRefetch = detailLoads;
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    window.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    window.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => detailLoads).toBeGreaterThan(beforeRefetch);
  await panel.getByRole("button", { name: "保存权限" }).click();
  await expect(
    panel.getByText("此员工资料已更新，请刷新列表后重试", { exact: true }),
  ).toBeVisible();
  expect(updates[0]).toMatchObject({ expectedVersion: 1 });
  await panel.getByRole("button", { name: "取消", exact: true }).click();
  await page.getByRole("button", { name: "编辑权限" }).click();
  await expect(panel.getByLabel("员工姓名")).toHaveValue("TEST 同事已更新");
  await panel.getByRole("checkbox", { name: "管理员", exact: true }).uncheck();
  await panel.getByRole("checkbox", { name: "财务", exact: true }).check();
  await panel
    .getByRole("radio", { name: "全部客户（包含今后新增客户）" })
    .check();
  await panel.getByRole("button", { name: "保存权限" }).click();
  await expect(panel).not.toBeVisible();
  expect(updates[1]).toMatchObject({ roles: ["finance"], expectedVersion: 2 });
  expect(updates[0]).toMatchObject({
    roles: ["cost_view", "finance"],
    allCustomers: true,
    customerIds: [],
    active: true,
    expectedVersion: 1,
  });
  await page.getByRole("button", { name: "停用", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "取消" })
    .click();
  expect(updates).toHaveLength(2);
  await page.getByRole("button", { name: "停用", exact: true }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "确认停用" })
    .click();
  await expect(
    page.getByRole("button", { name: "启用", exact: true }),
  ).toBeVisible();
  expect(updates[2]).toMatchObject({ active: false, expectedVersion: 3 });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "编辑权限" }).click();
  await expect(page.getByRole("dialog").getByLabel("员工姓名")).toBeVisible();
  await expect
    .poll(async () =>
      Math.round((await page.getByRole("dialog").boundingBox())?.x ?? -1),
    )
    .toBe(0);
  await page.screenshot({
    path: ".impeccable/review/staff-management-mobile.png",
    fullPage: true,
  });
});
