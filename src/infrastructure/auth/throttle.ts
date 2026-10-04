import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDatabase } from "../database/client";
import { BusinessError } from "@/modules/business/rules";
export async function throttle(identity: string, action: string) {
  const key = createHash("sha256")
    .update(`${action}:${identity.toLowerCase()}`)
    .digest("hex");
  const rows = await getDatabase().execute(
    sql`insert into app.rate_limits(key,window_start,hits) values(${key},now(),1) on conflict(key) do update set hits=case when app.rate_limits.window_start < now()-interval '15 minutes' then 1 else app.rate_limits.hits+1 end,window_start=case when app.rate_limits.window_start < now()-interval '15 minutes' then now() else app.rate_limits.window_start end returning hits`,
  );
  if (Number(rows[0].hits) > 10)
    throw new BusinessError("RATE_LIMITED", "尝试次数过多，请稍后再试", 429);
}
