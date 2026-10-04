import { NextResponse } from "next/server";
import { sessionClient } from "@/infrastructure/auth/supabase";
import { readConfig } from "@/infrastructure/config";
export async function GET(req: Request) {
  const url = new URL(req.url),
    client = await sessionClient(),
    code = url.searchParams.get("code"),
    hash = url.searchParams.get("token_hash"),
    type = url.searchParams.get("type");
  const result = code
    ? await client.auth.exchangeCodeForSession(code)
    : hash && ["invite", "recovery"].includes(type ?? "")
      ? await client.auth.verifyOtp({
          token_hash: hash,
          type: type as "invite" | "recovery",
        })
      : { error: true };
  return NextResponse.redirect(
    `${readConfig().origin}${result.error ? "/login" : "/auth/setup"}`,
  );
}
