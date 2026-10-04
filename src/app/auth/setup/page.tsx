import { AuthForm } from "@/components/business/AuthForm";
import { requireVerifiedIdentity } from "@/infrastructure/auth/identity";
import { getOnboardingState } from "@/modules/business/onboarding";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/business/AuthFrame";
import Link from "next/link";
export default async function Setup({
  searchParams,
}: {
  searchParams: Promise<{ flow?: string }>;
}) {
  const registration = (await searchParams).flow === "registration";
  if (registration) {
    const state = await requireVerifiedIdentity()
      .then(getOnboardingState)
      .catch(() => null);
    if (!state)
      return (
        <AuthFrame
          title="请先验证邮箱"
          description="打开验证邮件中的链接后，即可设置密码并继续注册。"
        >
          <Link href="/register">重新获取验证邮件</Link>
        </AuthFrame>
      );
    if (!state.needsPassword) redirect(state.destination);
  }
  return <AuthForm setup registration={registration} />;
}
