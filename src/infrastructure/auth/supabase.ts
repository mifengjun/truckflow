import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { readConfig } from "../config";
export async function sessionClient() {
  const config = readConfig(),
    jar = await cookies();
  return createServerClient(config.supabaseUrl, config.publishableKey, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (items) => {
        try {
          for (const { name, value, options } of items)
            jar.set(name, value, options);
        } catch {
          /* Server components refresh through proxy. */
        }
      },
    },
  });
}
export function adminClient() {
  const c = readConfig();
  return createClient(c.supabaseUrl, c.secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
