import "server-only";
import { eq } from "drizzle-orm";
import { getDatabase } from "../database/client";
import { profiles, staffAccess } from "../database/schema";
import { requireSessionIdentity } from "./identity";
import { BusinessError, type Actor } from "@/modules/business/rules";
export async function requireActor(): Promise<Actor> {
  const identity = await requireSessionIdentity();
  const db = getDatabase();
  const [p] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, identity.id));
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
