import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
const env = parseEnv(readFileSync(".env.local", "utf8"));
if (
  new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname !==
  "halitnbbzwwfirscmnlf.supabase.co"
)
  throw new Error("Project mismatch");
const client = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const options = {
  public: false,
  fileSizeLimit: 3000000,
  allowedMimeTypes: ["application/pdf", "image/png", "image/jpeg"],
};
const { data } = await client.storage.getBucket("business-documents");
const { error } = data
  ? await client.storage.updateBucket("business-documents", options)
  : await client.storage.createBucket("business-documents", options);
if (error) throw new Error("Private storage setup failed");
console.log("Private business storage ready");
