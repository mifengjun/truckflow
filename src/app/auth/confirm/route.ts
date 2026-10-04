import { NextResponse } from "next/server";
import { sessionClient } from "@/infrastructure/auth/supabase";
import { readConfig } from "@/infrastructure/config";
import { requireVerifiedIdentity } from "@/infrastructure/auth/identity";
import { getOnboardingState } from "@/modules/business/onboarding";
import { confirmationDestination } from "@/modules/business/auth-contracts";
export async function GET(req: Request) {
  const url = new URL(req.url),
    client = await sessionClient(),
    code = url.searchParams.get("code"),
    hash = url.searchParams.get("token_hash"),
    type = url.searchParams.get("type");
  const result = code
    ? await client.auth.exchangeCodeForSession(code)
    : hash &&
        ["signup", "email", "magiclink", "invite", "recovery"].includes(
          type ?? "",
        )
      ? await client.auth.verifyOtp({
          token_hash: hash,
          type: type as
            "signup" | "email" | "magiclink" | "invite" | "recovery",
        })
      : { error: true };
  let destination = "/auth/verify?status=invalid";
  if (!result.error) {
    try {
      const state = await getOnboardingState(await requireVerifiedIdentity());
      // Legacy PKCE invitation/recovery callback stays a password setup flow.
      destination = confirmationDestination(
        code ? "invite" : type!,
        state.destination,
      );
    } catch {
      destination = "/auth/verify?status=invalid";
    }
  }
  const response = NextResponse.redirect(
    `${readConfig().origin}${destination}`,
  );
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
