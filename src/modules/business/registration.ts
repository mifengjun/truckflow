import "server-only";
import { createClient } from "@supabase/supabase-js";
import { readConfig } from "@/infrastructure/config";
import { throttle } from "@/infrastructure/auth/throttle";
import { registrationInput, emailInput } from "./auth-contracts";
import { BusinessError } from "./rules";
export function registrationEnabled() {
  return process.env.REGISTRATION_ENABLED === "true";
}
function publicRegistrationClient() {
  if (!registrationEnabled())
    throw new BusinessError(
      "REGISTRATION_UNAVAILABLE",
      "自主注册正在准备中，请联系运营人员开通账号",
      503,
    );
  const c = readConfig();
  // Implicit mail confirmation supports the default template across devices.
  // The browser exchanges returned tokens through the same-origin session endpoint.
  return createClient(c.supabaseUrl, c.publishableKey, {
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
function checkMailError(error: { code?: string } | null) {
  if (!error || error.code === "user_already_exists") return;
  if (
    error.code === "over_email_send_rate_limit" ||
    error.code === "over_request_rate_limit"
  )
    throw new BusinessError("RATE_LIMITED", "发送次数过多，请稍后重试", 429);
  throw new BusinessError(
    "VERIFICATION_SEND_FAILED",
    "验证邮件暂时无法发送，请稍后重试或联系运营人员",
    502,
  );
}
export async function registerCustomer(value: unknown) {
  const d = registrationInput.parse(value),
    client = publicRegistrationClient();
  await throttle(d.email, "signup");
  const { error } = await client.auth.signUp({
    email: d.email,
    password: d.password,
    options: { emailRedirectTo: `${readConfig().origin}/auth/verify` },
  });
  checkMailError(error);
  return { message: "请检查邮箱中的验证邮件；如已有账号，请登录或找回密码。" };
}
export async function resendSignupVerification(value: unknown) {
  const d = emailInput.parse(value),
    client = publicRegistrationClient();
  await throttle(d.email, "signup-resend");
  const { error } = await client.auth.resend({
    type: "signup",
    email: d.email,
    options: { emailRedirectTo: `${readConfig().origin}/auth/verify` },
  });
  checkMailError(error);
  return {
    message: "如该邮箱需要验证，将收到新的验证邮件，请检查收件箱及垃圾邮件。",
  };
}
