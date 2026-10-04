import { redirect } from "next/navigation";
import { requireVerifiedIdentity } from "@/infrastructure/auth/identity";
import { getOnboardingState } from "@/modules/business/onboarding";
import { OnboardingForm } from "@/components/business/OnboardingForm";
import { BusinessError } from "@/modules/business/rules";
import { AuthFrame } from "@/components/business/AuthFrame";
import Link from "next/link";
export default async function Page() {
  const result = await requireVerifiedIdentity()
    .then(async (identity) => ({
      identity,
      state: await getOnboardingState(identity),
    }))
    .catch((error: unknown) => ({ error }));
  if ("error" in result) {
    if (
      result.error instanceof BusinessError &&
      result.error.code === "UNAUTHENTICATED"
    )
      redirect("/login");
    return (
      <AuthFrame
        title="暂时无法开通"
        description={
          result.error instanceof BusinessError
            ? result.error.message
            : "服务暂时不可用，请稍后重试"
        }
      >
        <Link href="/login">返回登录</Link>
      </AuthFrame>
    );
  }
  if (result.state.needsPassword || !result.state.needsOnboarding)
    redirect(result.state.destination);
  return <OnboardingForm email={result.identity.email} />;
}
