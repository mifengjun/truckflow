import { test, expect } from "@playwright/test";
test("public entry provides registration and the real mail readiness state", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("main")
    .getByRole("link", { name: "注册并询价", exact: true })
    .click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(
    page.getByRole("heading", { name: "注册客户账号" }),
  ).toBeVisible();
  await page.getByLabel("邮箱", { exact: true }).fill("new@example.invalid");
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(
    page.getByText("邮件服务待配置", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "发送验证邮件" }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "已有账号登录", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});
test("invalid verification provides recovery without redirect loops", async ({
  page,
}) => {
  await page.goto("/auth/verify?status=invalid");
  await expect(
    page.getByRole("heading", { name: "验证链接无法使用" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "返回登录", exact: true }),
  ).toBeVisible();
});

test("mail notice remembers the recipient without asking for the email again", async ({
  page,
  context,
}) => {
  await context.addCookies([
    {
      name: "registration-email",
      value: "new@example.invalid",
      url: "http://127.0.0.1:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto("/auth/verify");
  await expect(
    page.getByRole("heading", { name: "请查收验证邮件" }),
  ).toBeVisible();
  await expect(
    page.getByText("new@example.invalid", { exact: true }),
  ).toBeVisible();
  await expect(page.locator('input[type="email"]')).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByText("new@example.invalid", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "修改邮箱" }).click();
  await expect(page).toHaveURL(/\/register$/);
});
