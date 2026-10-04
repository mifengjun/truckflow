import "server-only";
import { createClient } from "@supabase/supabase-js";
import { readConfig } from "@/infrastructure/config";
import { throttle } from "@/infrastructure/auth/throttle";
import { registrationInput } from "./auth-contracts";
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
  // Initial sends and resends share a limit; both can resume unfinished registration.
  await throttle(d.email, "signup");
  const { error } = await client.auth.signInWithOtp({
    email: d.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${readConfig().origin}/auth/verify`,
    },
  });
  checkMailError(error);
  return {
    email: d.email,
    message: "验证邮件已发送，请检查收件箱及垃圾邮件。",
  };
}
export const resendSignupVerification = registerCustomer;
