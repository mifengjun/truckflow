import "server-only";
export function readConfig(
  env: Record<string, string | undefined> = process.env,
) {
  const required = [
    "APP_ORIGIN",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "DATABASE_URL",
  ] as const;
  const missing = required.filter((key) => !env[key]);
  if (missing.length)
    throw new Error(`CONFIGURATION_REQUIRED: ${missing.join(", ")}`);
  let origin: URL, url: URL, db: URL;
  try {
    origin = new URL(env.APP_ORIGIN!);
    url = new URL(env.NEXT_PUBLIC_SUPABASE_URL!);
    db = new URL(env.DATABASE_URL!);
  } catch {
    throw new Error("CONFIGURATION_INVALID");
  }
  if (
    !["https:", "http:"].includes(origin.protocol) ||
    url.protocol !== "https:" ||
    !["postgres:", "postgresql:"].includes(db.protocol) ||
    origin.origin !== env.APP_ORIGIN
  )
    throw new Error("CONFIGURATION_INVALID");
  return {
    origin: origin.origin,
    supabaseUrl: url.origin,
    publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    secretKey: env.SUPABASE_SECRET_KEY!,
    databaseUrl: env.DATABASE_URL!,
    caPath: env.DATABASE_SSL_CA_PATH || "supabase-ca.crt",
    environment: env.APP_ENV || "development",
  };
}
