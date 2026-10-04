import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDatabase } from "../database/client";
import { profiles, staffAccess } from "../database/schema";
import { sessionClient } from "./supabase";
import { BusinessError, type Actor } from "@/modules/business/rules";
export async function requireActor(): Promise<Actor> {
  const client = await sessionClient();
  const { data, error } = await client.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub || typeof claims.session_id !== "string")
    throw new BusinessError("UNAUTHENTICATED", "请先登录", 401);
  const db = getDatabase();
  const valid = await db.execute(
    sql`select app.session_active(${claims.sub}::uuid,${claims.session_id}::uuid) as active`,
  );
  if (!valid[0]?.active)
    throw new BusinessError("UNAUTHENTICATED", "登录已失效，请重新登录", 401);
  const [p] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, claims.sub));
  if (!p?.active)
    throw new BusinessError("ACCOUNT_DISABLED", "账号尚未开通或已停用", 403);
  const assigned =
    p.identity === "staff" && !p.allCustomers
      ? await db
          .select({ customerId: staffAccess.customerId })
          .from(staffAccess)
          .where(eq(staffAccess.staffId, p.id))
      : [];
  return {
    id: p.id,
    name: p.name,
    identity: p.identity,
    customerId: p.customerId,
    roles: p.roles,
    allCustomers: p.allCustomers,
    customerIds: assigned.map((x) => x.customerId),
  };
}
