import { redirect } from "next/navigation";
import { requireActor } from "@/infrastructure/auth/actor";
import { readConfig } from "@/infrastructure/config";
import { homeForActor } from "@/modules/business/rules";
import { Shell } from "./Shell";
import { requireVerifiedIdentity } from "@/infrastructure/auth/identity";
import { getOnboardingState } from "@/modules/business/onboarding";
import { BusinessError } from "@/modules/business/rules";
import { AuthFrame } from "./AuthFrame";
import Link from "next/link";
export async function BusinessLayout({
  identity,
  children,
}: {
  identity: "customer" | "staff";
  children: React.ReactNode;
}) {
  const result = await requireActor()
    .then((actor) => ({ actor }))
    .catch((error: unknown) => ({ error }));
  if ("error" in result) {
    if (
      result.error instanceof BusinessError &&
      result.error.code === "PASSWORD_REQUIRED"
    )
      redirect("/auth/setup");
    if (
      result.error instanceof BusinessError &&
      result.error.code === "UNAUTHENTICATED"
    )
      redirect("/login");
    if (
      result.error instanceof BusinessError &&
      result.error.code === "ACCOUNT_DISABLED"
    ) {
      const state = await requireVerifiedIdentity()
        .then(getOnboardingState)
        .catch(() => null);
      if (state?.needsOnboarding) redirect(state.destination);
    }
    return (
      <AuthFrame
        title="无法进入工作区"
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
  const actor = result.actor;
  if (actor.identity !== identity) redirect(homeForActor(actor));
  return (
    <Shell actor={actor} environment={readConfig().environment}>
      {children}
    </Shell>
  );
}
