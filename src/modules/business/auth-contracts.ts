import { z } from "zod";
export const onboardingInput = z
  .object({
    companyName: z.string().trim().min(1, "请填写公司或业务名称").max(100),
    contact: z.string().trim().min(1, "请填写联系人").max(100),
    phone: z.string().trim().min(3, "请填写联系电话").max(40),
  })
  .strict();
export const emailInput = z
  .object({
    email: z.email("请输入有效邮箱").transform((v) => v.toLowerCase()),
  })
  .strict();
export const registrationInput = emailInput
  .extend({
    password: z.string().min(12, "密码至少 12 位").max(200),
    confirmPassword: z.string().min(1, "请再次输入密码"),
  })
  .strict()
  .refine((d) => d.password === d.confirmPassword, {
    message: "两次密码不一致",
    path: ["confirmPassword"],
  });
export function confirmationDestination(type: string, next: string) {
  if (!["signup", "invite", "recovery"].includes(type))
    throw new Error("Invalid confirmation type");
  if (
    ![
      "/onboarding",
      "/portal/orders",
      "/portal/finance",
      "/admin/orders",
      "/admin/settlement",
      "/admin/customers",
    ].includes(next)
  )
    throw new Error("Invalid destination");
  return type === "signup" ? next : "/auth/setup";
}
