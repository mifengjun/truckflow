// Explicit first administrator invitation; safe to retry without resetting passwords.
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
const env = parseEnv(readFileSync(".env.local", "utf8")),
  email = process.argv[2];
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  throw new Error("Provide administrator email");
if (
  decodeURIComponent(new URL(env.MIGRATION_DATABASE_URL).username) !==
  "postgres.halitnbbzwwfirscmnlf"
)
  throw new Error("Project mismatch");
const db = postgres(env.MIGRATION_DATABASE_URL, {
    max: 1,
    prepare: false,
    ssl: {
      ca: readFileSync("supabase-ca.crt", "utf8"),
      rejectUnauthorized: true,
    },
  }),
  client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
try {
  const [existing] =
    await db`select p.id,p.identity from app.profiles p join auth.users u on u.id=p.id where lower(u.email)=lower(${email})`;
  if (existing) {
    if (existing.identity !== "staff")
      throw new Error("Email already belongs to customer");
    console.log(
      "Administrator already provisioned; existing password unchanged",
    );
  } else {
    const { data, error } = await client.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${env.APP_ORIGIN}/auth/setup`,
    });
    if (error || !data.user) {
      console.log(
        JSON.stringify({ invited: false, code: error?.code ?? "unknown" }),
      );
      process.exitCode = 1;
    } else {
      await db`insert into app.profiles(id,name,identity,roles,all_customers) values(${data.user.id},'运营管理员','staff',array['operations','finance','admin','cost_view'],true)`;
      console.log("Administrator provisioned; invitation email sent");
    }
  }
} finally {
  await db.end();
}
