import { readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { randomBytes } from "node:crypto";
import postgres from "postgres";
const file = ".env.local",
  content = readFileSync(file, "utf8"),
  env = parseEnv(content);
const target = new URL(env.MIGRATION_DATABASE_URL);
if (target.username !== "postgres.halitnbbzwwfirscmnlf")
  throw new Error("Unexpected migration project");
const sql = postgres(target.href, {
  max: 1,
  prepare: false,
  ssl: {
    ca: readFileSync("supabase-ca.crt", "utf8"),
    rejectUnauthorized: true,
  },
});
try {
  if (!env.DATABASE_URL) {
    const password = randomBytes(32).toString("hex");
    await sql.unsafe(
      "alter role truckflow_runtime password '" + password + "'",
    );
    target.username = "truckflow_runtime.halitnbbzwwfirscmnlf";
    target.password = password;
    const updated = content.replace(
      /^DATABASE_URL=.*$/m,
      'DATABASE_URL="' + target.href + '"',
    );
    writeFileSync(file, updated, { mode: 0o600 });
  }
  console.log(
    "Restricted runtime database configuration ready; credentials not printed.",
  );
} finally {
  await sql.end();
}
