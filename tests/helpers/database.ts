import postgres from "postgres";
import { readFileSync } from "node:fs";
const uri = process.env.MIGRATION_DATABASE_URL!;
if (!uri || new URL(uri).username !== "postgres.halitnbbzwwfirscmnlf")
  throw new Error(
    "Integration tests require the designated development project",
  );
export const adminDb = postgres(uri, {
  max: 1,
  prepare: false,
  ssl: {
    ca: readFileSync("supabase-ca.crt", "utf8"),
    rejectUnauthorized: true,
  },
  connect_timeout: 10,
});
