import "server-only";
import { adminClient } from "@/infrastructure/auth/supabase";
import { readConfig } from "@/infrastructure/config";
import { BusinessError } from "./rules";
// An explicit reserved UUID makes a retry safe after an interrupted Auth request.
export async function ensureStaffIdentity(id: string, email: string) {
  const auth = adminClient().auth.admin;
  const found = await auth.getUserById(id);
  if (found.data.user) {
    if (found.data.user.email?.toLowerCase() !== email)
      throw new BusinessError(
        "EMAIL_IN_USE",
        "账号邮箱已变更，请联系管理员核查",
        409,
      );
    return;
  }
  if (found.error?.status !== 404)
    throw new BusinessError(
      "AUTH_UNAVAILABLE",
      "账号服务暂时不可用，请稍后重试",
      502,
    );
  const { data, error } = await auth.createUser({
    id,
    email,
    email_confirm: false,
  });
  if (error || data.user?.id !== id)
    throw new BusinessError(
      "STAFF_CREATE_FAILED",
      "账号建立失败，邮箱可能已被使用，请核查后重试",
      502,
    );
}
export async function sendStaffSetupEmail(email: string) {
  const { error } = await adminClient().auth.resetPasswordForEmail(email, {
    redirectTo: `${readConfig().origin}/auth/setup`,
  });
  if (error)
    throw new BusinessError(
      "MAIL_FAILED",
      "设置密码邮件未发送成功，请稍后重试",
      502,
    );
}
