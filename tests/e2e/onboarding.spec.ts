import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

// Generates a disposable verification link without sending mail. Public signup
// remains disabled until SMTP is configured; the callback and UI use real Auth.
test("邮箱验证后完善资料并提交首次询价", async ({ page, browser }) => {
  test.setTimeout(90000);
  const env = parseEnv(readFileSync(".env.local", "utf8"));
  if (
    env.APP_ENV === "production" ||
    env.APP_ORIGIN !== "http://127.0.0.1:3000" ||
    new URL(env.MIGRATION_DATABASE_URL!).username !==
      "postgres.halitnbbzwwfirscmnlf"
  )
    throw Error("Disposable test requires designated local development");
  const auth = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
  const db = postgres(env.MIGRATION_DATABASE_URL!, {
    max: 1,
    prepare: false,
    ssl: {
      ca: readFileSync("supabase-ca.crt", "utf8"),
      rejectUnauthorized: true,
    },
  });
  const email = `qa-browser-onboarding-${randomUUID()}@example.invalid`;
  let id: string | undefined;
  try {
    const { data, error } = await auth.auth.admin.generateLink({
      type: "signup",
      email,
      password: randomUUID() + "Aa1!",
    });
    if (error || !data.user || !data.properties?.hashed_token)
      throw Error("Disposable signup link failed");
    id = data.user.id;
    await page.goto(
      `/auth/confirm?type=signup&token_hash=${encodeURIComponent(data.properties.hashed_token)}`,
    );
    await expect(page).toHaveURL(/\/onboarding$/, { timeout: 20000 });
    await page.getByLabel("公司或业务名称").fill("TEST Browser Self Signup");
    await page.getByLabel("联系人", { exact: true }).fill("TEST Contact");
    await page.getByLabel("联系电话").fill("+86 13800000000");
    await page.getByRole("button", { name: "保存并开始询价" }).click();
    await expect(page).toHaveURL(/\/portal\/inquiry$/, { timeout: 20000 });
    for (const side of ["origin", "destination"]) {
      for (const [key, value] of Object.entries({
        name: "TEST Warehouse",
        street: "123 Warehouse Street",
        city: "Los Angeles",
        state: "CA",
        postalCode: "90001",
        contact: "TEST Contact",
        phone: "5551234567",
      }))
        await page.locator(`[id="${side}.${key}"]`).fill(value);
      await page.locator(`[id="${side}.type"]`).selectOption("commercial");
    }
    await page
      .locator("#pickupDate")
      .fill(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
    await page.getByRole("button", { name: "下一步：货物与服务" }).click();
    for (const [key, value] of Object.entries({
      name: "TEST Goods",
      quantity: "1",
      weight: "100",
      length: "48",
      width: "40",
      height: "52",
    }))
      await page.locator(`[id="goods.0.${key}"]`).fill(value);
    await page.getByRole("button", { name: "提交询价", exact: true }).click();
    await expect(page).toHaveURL(/\/portal\/inquiries\/[a-f0-9-]+/, {
      timeout: 20000,
    });
    await expect(page.getByText("TEST Goods", { exact: true })).toBeVisible();
    const inquiryUrl = page.url(),
      inquiryId = inquiryUrl.split("/").at(-1);
    const fixture = JSON.parse(readFileSync(".env.browser-test.local", "utf8"));
    const staff = fixture.identities.find(
      (i: { identity: string }) => i.identity === "staff",
    );
    const staffContext = await browser.newContext({
      baseURL: "http://127.0.0.1:3000",
    });
    try {
      const operator = await staffContext.newPage();
      await operator.goto("/login");
      await operator.getByLabel("邮箱").fill(staff.email);
      await operator.getByLabel("密码").fill("QA-Truckflow-Flow-2026-Only!");
      await operator.getByRole("button", { name: "登录", exact: true }).click();
      await expect(operator).toHaveURL(/\/admin/, { timeout: 20000 });
      await operator.goto(`/admin/inquiries/${inquiryId}`);
      await operator.getByLabel("承运商 / 代理").fill("TEST Browser Carrier");
      await operator.getByLabel("采购成本 USD").fill("300");
      await operator.getByLabel("第 1 项费用金额").fill("360");
      await operator
        .getByLabel("报价有效至（你的本地时区）")
        .fill(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
      await operator.getByLabel("参考时效").fill("TEST 3–5 天");
      await operator
        .getByLabel("报价来源 / 核实依据")
        .fill("TEST 无外部承运商操作");
      await operator
        .getByRole("button", { name: "保存报价草稿", exact: true })
        .click();
      await operator
        .getByRole("button", { name: "发布给客户", exact: true })
        .click();
      await expect(operator.getByText("已发布", { exact: true })).toBeVisible();
      await page.reload();
      await expect(
        page.getByText("TEST Browser Carrier", { exact: true }),
      ).toBeVisible();
    } finally {
      await staffContext.close();
    }
    const [customer] =
      await db`select c.source,a.balance,a.held_amount from app.profiles p join app.customers c on c.id=p.customer_id join app.accounts a on a.customer_id=c.id where p.id=${id}`;
    expect(customer).toMatchObject({
      source: "self_signup",
      balance: "0.00",
      held_amount: "0.00",
    });
  } finally {
    if (id) {
      const [profile] =
        await db`select customer_id from app.profiles where id=${id}`;
      await db`delete from app.audit_events where actor_id=${id} or customer_id=${profile?.customer_id ?? null}`;
      if (profile?.customer_id) {
        const [c] =
          await db`select name from app.customers where id=${profile.customer_id}`;
        if (c?.name !== "TEST Browser Self Signup")
          throw Error("Disposable cleanup identity mismatch");
        for (const table of [
          "quote_costs",
          "quotes",
          "inquiries",
          "accounts",
          "profiles",
        ])
          await db.unsafe(
            `delete from app.${table} where customer_id=$1::uuid`,
            [profile.customer_id],
          );
        await db`delete from app.customers where id=${profile.customer_id}`;
      }
      await auth.auth.admin.deleteUser(id);
    }
    await db.end();
  }
});
