import { test, expect } from "@playwright/test";
test("public entry provides registration and the real mail readiness state", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "注册并询价", exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(
    page.getByRole("heading", { name: "注册客户账号" }),
  ).toBeVisible();
  await page.getByLabel("邮箱", { exact: true }).fill("new@example.invalid");
  await expect(
    page.getByText("邮件服务待配置", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "注册并发送验证邮件" }),
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
