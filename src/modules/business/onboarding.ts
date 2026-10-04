import "server-only";
import { eq, or, sql } from "drizzle-orm";
import {
  accounts,
  customers,
  invitations,
  profiles,
  audit,
} from "@/infrastructure/database/schema";
import { type VerifiedIdentity } from "@/infrastructure/auth/identity";
import { database } from "./common";
import { BusinessError, homeForActor, type Actor } from "./rules";
import { onboardingInput } from "./auth-contracts";
function destination(p: typeof profiles.$inferSelect) {
  if (!p.active) throw new BusinessError("ACCOUNT_DISABLED", "账号已停用", 403);
  return homeForActor({ ...p, customerIds: [] } as Actor);
}
export async function getOnboardingState(identity: VerifiedIdentity) {
  const [p] = await database()
    .select()
    .from(profiles)
    .where(eq(profiles.id, identity.id));
  return {
    needsOnboarding: !p,
    destination: p ? destination(p) : "/onboarding",
  };
}
export async function completeOnboarding(
  identity: VerifiedIdentity,
  value: unknown,
): Promise<{ customerId: string; destination: string }> {
  const d = onboardingInput.parse(value);
  return database().transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${identity.id},0))`,
    );
    const [p] = await tx
      .select()
      .from(profiles)
      .where(eq(profiles.id, identity.id));
    if (p) {
      const next = destination(p);
      if (p.identity !== "customer" || !p.customerId)
        throw new BusinessError(
          "ALREADY_PROVISIONED",
          "此账号无需建立客户资料",
          409,
        );
      return { customerId: p.customerId, destination: next };
    }
    const [invite] = await tx
      .select({ id: invitations.id })
      .from(invitations)
      .where(
        or(
          eq(invitations.userId, identity.id),
          eq(invitations.email, identity.email),
        ),
      );
    if (invite)
      throw new BusinessError(
        "INVITED_ACCOUNT",
        "此账号已有邀请，请联系管理员完成开通",
        409,
      );
    const [c] = await tx
      .insert(customers)
      .values({
        name: d.companyName,
        contact: d.contact,
        phone: d.phone,
        email: identity.email,
        source: "self_signup",
      })
      .returning();
    await tx.insert(accounts).values({ customerId: c.id });
    await tx
      .insert(profiles)
      .values({
        id: identity.id,
        name: d.contact,
        identity: "customer",
        customerId: c.id,
        roles: ["customer_operator", "customer_finance"],
      });
    await tx
      .insert(audit)
      .values({
        actorId: identity.id,
        customerId: c.id,
        action: "customer.self_signup",
        resourceId: c.id,
      });
    return { customerId: c.id, destination: "/portal/inquiry" };
  });
}
