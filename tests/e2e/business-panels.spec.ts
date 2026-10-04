import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
const fixture = existsSync(".env.browser-test.local")
  ? JSON.parse(readFileSync(".env.browser-test.local", "utf8"))
  : null;
test.skip(!fixture, "Create disposable browser fixtures first");
test.setTimeout(60000);
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const proofId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const address = {
  name: "TEST 仓库",
  street: "123 Warehouse Street",
  city: "Los Angeles",
  state: "CA",
  postalCode: "90001",
  contact: "Tester",
  phone: "1234567890",
  type: "commercial",
  timezone: "America/Los_Angeles",
};
const shipment = {
  origin: address,
  destination: address,
  pickupDate: "2026-10-06",
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
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCioAAAAASUVORK5CYII=",
  "base64",
);
const sessions: Partial<
  Record<"customer" | "staff", Awaited<ReturnType<BrowserContext["cookies"]>>>
> = {};
async function login(page: Page, identity: "customer" | "staff") {
  if (sessions[identity]) {
    await page.context().addCookies(sessions[identity]!);
    return;
  }
  await page.goto("/login");
  await page
    .getByLabel("邮箱")
    .fill(
      fixture.identities.find(
        (x: { identity: string }) => x.identity === identity,
      ).email,
    );
  await page.getByLabel("密码").fill("QA-Truckflow-Flow-2026-Only!");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page).toHaveURL(
    identity === "staff" ? /\/admin\// : /\/portal\//,
    { timeout: 20000 },
  );
  sessions[identity] = await page.context().cookies();
}
async function refocus(page: Page) {
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
}
async function mobileScreenshot(page: Page, name: string) {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await expect
    .poll(async () => {
      const box = await page.getByRole("dialog").boundingBox();
      return !!box && box.x >= -1 && box.x + box.width <= 391;
    })
    .toBe(true);
  await page.screenshot({
    path: `.impeccable/review/business-panels/${name}.png`,
    fullPage: true,
  });
}
test("地址抽屉：失败保留输入、保存期间不可关闭、重开读取更新资料", async ({
  page,
}) => {
  await login(page, "customer");
  let record = { id, scope: "private", version: 1, data: address };
  let writes = 0,
    payload: unknown;
  let release: (() => void) | undefined;
  await page.route("**/api/v1/addresses**", async (route) => {
    if (route.request().method() === "GET")
      return route.fulfill({ json: [record] });
    writes++;
    payload = route.request().postDataJSON();
    if (writes === 1)
      return route.fulfill({
        status: 503,
        json: { message: "测试：暂时无法保存" },
      });
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    record = {
      ...record,
      data: { ...address, name: "TEST 修改仓库", type: "residential" },
      version: 2,
    };
    await route.fulfill({ json: record });
  });
  await page.goto("/portal/addresses");
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  const panel = page.getByRole("dialog");
  await panel.getByLabel("场所名称").fill("TEST 修改仓库");
  await panel.getByLabel("地址类型").selectOption("residential");
  await panel.getByRole("button", { name: "保存地址" }).click();
  await expect(panel.getByText("测试：暂时无法保存")).toBeVisible();
  await expect(panel.getByLabel("场所名称")).toHaveValue("TEST 修改仓库");
  await panel.getByRole("button", { name: "保存地址" }).click();
  await expect.poll(() => writes).toBe(2);
  await page.keyboard.press("Escape");
  await expect(panel).toBeVisible();
  await expect(panel.getByRole("button", { name: "取消" })).toBeDisabled();
  release!();
  await expect(panel).not.toBeVisible();
  expect(payload).toMatchObject({
    expectedVersion: 1,
    data: {
      name: "TEST 修改仓库",
      type: "residential",
      timezone: address.timezone,
    },
  });
  await expect(
    page.getByRole("button", { name: "编辑", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "编辑", exact: true }).click();
  await expect(panel.getByLabel("场所名称")).toHaveValue("TEST 修改仓库");
  await mobileScreenshot(page, "address-mobile");
});
test("充值弹窗：上传参数正确，提交后展示充值申请而非停留流水", async ({
  page,
}) => {
  await login(page, "customer");
  await page.route("**/api/v1/account", (r) =>
    r.fulfill({ json: { balance: "0", heldAmount: "0", available: "0" } }),
  );
  await page.route("**/api/v1/ledger**", (r) => r.fulfill({ json: [] }));
  let submitted = false,
    payload: unknown,
    upload = "";
  const record = {
    id,
    customerId: fixture.companyId,
    amount: "125.50",
    receivedAmount: null,
    reference: "TEST transfer",
    proofId,
    status: "pending",
    reason: null,
    version: 1,
    createdAt: new Date().toISOString(),
  };
  await page.route("**/api/v1/recharges", async (r) => {
    if (r.request().method() === "POST") {
      submitted = true;
      payload = r.request().postDataJSON();
      return r.fulfill({ json: record });
    }
    await r.fulfill({ json: submitted ? [record] : [] });
  });
  await page.route("**/api/v1/attachments", async (r) => {
    upload = r.request().postData() ?? "";
    await r.fulfill({ json: { id: proofId } });
  });
  await page.goto("/portal/finance");
  await page.getByRole("tab", { name: "资金流水" }).click();
  await page.getByRole("button", { name: "申请充值", exact: true }).click();
  const panel = page.getByRole("dialog");
  await panel.getByLabel("申报金额 USD").fill("125.50");
  await panel.getByLabel("转账参考号 / 说明").fill("TEST transfer");
  await panel
    .getByLabel("转账凭证（")
    .setInputFiles({ name: "proof.png", mimeType: "image/png", buffer: png });
  await mobileScreenshot(page, "recharge-mobile");
  await panel.getByRole("button", { name: "提交财务核验" }).click();
  await expect(panel).not.toBeVisible();
  expect(payload).toEqual({
    amount: "125.50",
    reference: "TEST transfer",
    proofId,
  });
  expect(upload).toContain("recharge_proof");
  expect(upload).toContain("proof.png");
  await expect(page.getByRole("tab", { name: "充值申请" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByText("TEST transfer", { exact: true })).toBeVisible();
});
test("财务核验：凭证失败可重试，入账与只读记录正确显示", async ({ page }) => {
  await login(page, "staff");
  let record = {
    id,
    customerId: fixture.companyId,
    amount: "125.50",
    receivedAmount: null as string | null,
    reference: "TEST transfer",
    proofId,
    status: "pending",
    reason: null as string | null,
    version: 1,
    createdAt: new Date().toISOString(),
  };
  let previewMode: "http-error" | "corrupt" | "image" = "http-error";
  let payload: unknown;
  await page.route("**/api/v1/recharges**", async (r) => {
    if (r.request().method() === "POST") {
      payload = r.request().postDataJSON();
      record = {
        ...record,
        status: "verified",
        receivedAmount: "120.00",
        reason: "TEST 银行已到账",
        version: 2,
      };
      return r.fulfill({ json: record });
    }
    return r.fulfill({ json: [record] });
  });
  await page.route("**/api/v1/account?**", (r) =>
    r.fulfill({ json: { balance: "100", heldAmount: "0", available: "100" } }),
  );
  await page.route(`**/api/v1/attachments/${proofId}/download`, async (r) => {
    if (previewMode === "http-error")
      return r.fulfill({ status: 502, body: "unavailable" });
    return r.fulfill({
      contentType: "image/png",
      body: previewMode === "corrupt" ? png.subarray(0, 8) : png,
    });
  });
  await page.goto("/admin/settlement");
  await page.getByRole("button", { name: "核验", exact: true }).click();
  const panel = page.getByRole("dialog");
  await expect(panel.getByRole("button", { name: "重新加载" })).toBeVisible();
  previewMode = "corrupt";
  await panel.getByRole("button", { name: "重新加载" }).click();
  await expect(
    panel.getByText("凭证暂无法预览，可打开原文件查看。"),
  ).toBeVisible();
  previewMode = "image";
  await panel.getByRole("button", { name: "重新加载" }).click();
  await expect(
    panel.getByRole("img", { name: "客户提交的转账凭证" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      panel
        .getByRole("img")
        .evaluate((el) => (el as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await panel.getByLabel("银行实际到账 USD").fill("120.00");
  await panel.getByLabel("银行交易参考号").fill("TEST-bank-ref");
  await panel.getByLabel("核验说明").fill("TEST 银行已到账");
  await mobileScreenshot(page, "settlement-mobile");
  await panel.getByRole("button", { name: "确认入账" }).click();
  await expect(panel).not.toBeVisible();
  expect(payload).toEqual({
    expectedVersion: 1,
    amount: "120.00",
    bankReference: "TEST-bank-ref",
    reason: "TEST 银行已到账",
  });
  await page.getByRole("button", { name: "查看记录" }).click();
  await expect(
    panel.getByRole("heading", { name: "充值记录", exact: true }),
  ).toBeVisible();
  await expect(panel.getByRole("button", { name: "确认入账" })).toHaveCount(0);
  await expect(panel.getByText("TEST 银行已到账")).toBeVisible();
});
test("询价抽屉：费用明细正确提交，保存后切换报价标签，取消不写入", async ({
  page,
}) => {
  await login(page, "staff");
  const inquiry = {
    id,
    number: "TEST-INQUIRY",
    customerId: fixture.companyId,
    data: shipment,
    status: "pending",
    reason: null,
    quotes: [],
    order: null,
    createdAt: new Date().toISOString(),
  };
  let payload: unknown,
    noQuotes = 0;
  await page.route(`**/api/v1/inquiries/${id}`, (r) =>
    r.fulfill({ json: inquiry }),
  );
  await page.route(`**/api/v1/inquiries/${id}/quotes`, async (r) => {
    payload = r.request().postDataJSON();
    await r.fulfill({ json: { id: proofId } });
  });
  await page.route(`**/api/v1/inquiries/${id}/no-quote`, async (r) => {
    noQuotes++;
    await r.fulfill({ json: {} });
  });
  await page.goto(`/admin/inquiries/${id}`);
  await page.getByRole("button", { name: "录入报价", exact: true }).click();
  const panel = page.getByRole("dialog");
  await panel.getByLabel("承运商 / 代理").fill("TEST Carrier");
  await panel.getByLabel("采购成本 USD").fill("90.00");
  await panel.getByLabel("第 1 项费用金额").fill("100.00");
  await panel.getByRole("button", { name: "添加费用" }).click();
  await panel.getByLabel("第 2 项费用名称").fill("尾板");
  await panel.getByLabel("第 2 项费用金额").fill("25.50");
  await panel.getByLabel("报价有效至").fill("2026-12-31T18:00");
  await panel.getByLabel("参考时效").fill("3–5 days");
  await panel.getByLabel("报价来源 / 核实依据").fill("TEST email quote");
  await mobileScreenshot(page, "quote-mobile");
  await panel.getByRole("button", { name: "保存报价草稿" }).click();
  await expect(panel).not.toBeVisible();
  expect(payload).toMatchObject({
    carrier: "TEST Carrier",
    cost: "90.00",
    fees: [
      { label: "运费", amount: "100.00" },
      { label: "尾板", amount: "25.50" },
    ],
    evidence: "TEST email quote",
  });
  await expect(page.getByRole("tab", { name: "承运报价" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("button", { name: "标记暂无报价", exact: true }).click();
  await panel.getByLabel("客户可见原因").fill("TEST 暂无可用运力");
  await panel.getByRole("button", { name: "取消", exact: true }).click();
  expect(noQuotes).toBe(0);
  await page.getByRole("button", { name: "标记暂无报价", exact: true }).click();
  await panel.getByLabel("客户可见原因").fill("TEST 暂无可用运力");
  await panel
    .getByRole("button", { name: "标记暂无报价", exact: true })
    .click();
  await expect.poll(() => noQuotes).toBe(1);
  await expect(panel).not.toBeVisible();
});
test("订单抽屉：开始处理后进入下一步，后台刷新不能跳过版本冲突", async ({
  page,
}) => {
  await login(page, "staff");
  let order = {
    id,
    number: "TEST-ORDER",
    customerId: fixture.companyId,
    amount: "125.50",
    status: "pending_review",
    fulfillment: "awaiting_pickup",
    version: 1,
    snapshot: { inquiry: shipment, carrier: "TEST Carrier", fees: [] },
    externalId: null,
    tracking: null,
    createdAt: new Date().toISOString(),
    timeline: [],
    documents: [],
  };
  let reads = 0,
    payload: Record<string, unknown> | undefined;
  await page.route(`**/api/v1/orders/${id}`, async (r) => {
    reads++;
    await r.fulfill({ json: order });
  });
  await page.route(`**/api/v1/orders/${id}/start`, async (r) => {
    expect(r.request().postDataJSON()).toEqual({ expectedVersion: 1 });
    order = { ...order, status: "submitting", version: 2 };
    await r.fulfill({ json: { id, status: "submitting", version: 2 } });
  });
  await page.route(`**/api/v1/orders/${id}/result`, async (r) => {
    payload = r.request().postDataJSON();
    await r.fulfill({
      status: 409,
      json: { message: "订单已更新，请刷新后重试" },
    });
  });
  await page.goto(`/admin/orders/${id}`);
  await page.getByRole("button", { name: "处理订单", exact: true }).click();
  const panel = page.getByRole("dialog");
  await panel.getByRole("button", { name: "开始人工下单" }).click();
  await expect(panel.getByLabel("承运商结果")).toBeVisible();
  await panel.getByLabel("承运商结果").selectOption("failed");
  await panel.getByLabel("核实依据").fill("TEST 确认没有生成承运单");
  await panel.getByRole("checkbox", { name: "已核实承运商未生成订单" }).check();
  const before = reads;
  order = { ...order, version: 3 };
  await refocus(page);
  await expect.poll(() => reads).toBeGreaterThan(before);
  await panel.getByRole("button", { name: "记录处理结果" }).click();
  await expect(panel.getByText("订单已更新，请刷新后重试")).toBeVisible();
  expect(payload).toMatchObject({
    expectedVersion: 2,
    result: "failed",
    confirmedNoExternalOrder: true,
  });
  await mobileScreenshot(page, "order-mobile");
});
test("订单单据弹窗：上传失败保留文件，重试成功后更新单据标签", async ({
  page,
}) => {
  await login(page, "staff");
  const documents: { id: string; filename: string; kind: string }[] = [];
  const order = {
    id,
    number: "TEST-DOCUMENT",
    customerId: fixture.companyId,
    amount: "125.50",
    status: "accepted",
    fulfillment: "awaiting_pickup",
    version: 2,
    snapshot: { inquiry: shipment, carrier: "TEST Carrier", fees: [] },
    externalId: "EXT-1",
    tracking: "TRACK-1",
    createdAt: new Date().toISOString(),
    timeline: [],
    documents,
  };
  let uploads = 0,
    data = "";
  await page.route(`**/api/v1/orders/${id}`, (r) => r.fulfill({ json: order }));
  await page.route("**/api/v1/attachments", async (r) => {
    uploads++;
    data = r.request().postData() ?? "";
    if (uploads === 1)
      return r.fulfill({
        status: 503,
        json: { message: "测试：上传失败，请重试" },
      });
    documents.push({ id: proofId, filename: "pod.png", kind: "POD" });
    await r.fulfill({ json: { id: proofId } });
  });
  await page.goto(`/admin/orders/${id}`);
  await page.getByRole("tab", { name: "单据", exact: true }).click();
  await page.getByRole("button", { name: "上传单据", exact: true }).click();
  const panel = page.getByRole("dialog");
  await panel.getByLabel("单据类型").selectOption("POD");
  await panel
    .getByLabel("文件（")
    .setInputFiles({ name: "pod.png", mimeType: "image/png", buffer: png });
  await panel.getByRole("button", { name: "上传单据", exact: true }).click();
  await expect(panel.getByText("测试：上传失败，请重试")).toBeVisible();
  await expect(panel.getByLabel("单据类型")).toHaveValue("POD");
  expect(
    await panel
      .locator('input[type="file"]')
      .evaluate((el) => (el as HTMLInputElement).files?.[0]?.name),
  ).toBe("pod.png");
  await panel.getByRole("button", { name: "上传单据", exact: true }).click();
  await expect(panel).not.toBeVisible();
  expect(data).toContain(id);
  expect(data).toContain("POD");
  expect(data).toContain("pod.png");
  await expect(page.getByRole("link", { name: "POD · pod.png" })).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "单据", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
});
test("财务核验：PDF 预览及驳回分支不提交入账字段", async ({ page }) => {
  await login(page, "staff");
  const record = {
    id,
    customerId: fixture.companyId,
    amount: "125.50",
    receivedAmount: null,
    reference: "TEST PDF",
    proofId,
    status: "pending",
    reason: null,
    version: 4,
    createdAt: new Date().toISOString(),
  };
  let payload: unknown;
  await page.route("**/api/v1/recharges**", async (r) => {
    if (r.request().method() === "POST") {
      payload = r.request().postDataJSON();
      return r.fulfill({ json: { id } });
    }
    return r.fulfill({ json: [record] });
  });
  await page.route("**/api/v1/account?**", (r) =>
    r.fulfill({ json: { balance: "0", heldAmount: "0", available: "0" } }),
  );
  await page.route(`**/api/v1/attachments/${proofId}/download`, (r) =>
    r.fulfill({
      contentType: "application/pdf",
      body: "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF",
    }),
  );
  await page.goto("/admin/settlement");
  await page.getByRole("button", { name: "核验", exact: true }).click();
  const panel = page.getByRole("dialog");
  await expect(panel.locator('iframe[title="转账凭证 PDF"]')).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await panel.getByLabel("处理方式").selectOption("reject");
  await expect(panel.getByLabel("银行实际到账 USD")).toHaveCount(0);
  await panel.getByLabel("客户可见驳回原因").fill("TEST 未查到对应银行流水");
  await panel.getByRole("button", { name: "确认驳回" }).click();
  await expect(panel).not.toBeVisible();
  expect(payload).toEqual({
    expectedVersion: 4,
    reason: "TEST 未查到对应银行流水",
  });
});
