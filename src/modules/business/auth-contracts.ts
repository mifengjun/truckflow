import { z } from "zod";
export const passwordInput = z
  .string()
  .min(6, "密码至少 6 位")
  .max(200)
  .regex(/[A-Za-z]/, "密码需包含字母和数字")
  .regex(/[0-9]/, "密码需包含字母和数字");
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
export const registrationInput = emailInput;
export function confirmationDestination(type: string, next: string) {
  if (!["signup", "email", "magiclink", "invite", "recovery"].includes(type))
    throw new Error("Invalid confirmation type");
  if (
    ![
      "/onboarding",
      "/auth/setup?flow=registration",
      "/portal/orders",
      "/portal/finance",
      "/admin/orders",
      "/admin/settlement",
      "/admin/customers",
    ].includes(next)
  )
    throw new Error("Invalid destination");
  return type === "invite" || type === "recovery" ? "/auth/setup" : next;
}
