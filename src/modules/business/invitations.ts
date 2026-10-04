import "server-only";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import {
  invitations,
  staffInvitations,
  profiles,
  customers,
} from "@/infrastructure/database/schema";
import { adminClient } from "@/infrastructure/auth/supabase";
import { readConfig } from "@/infrastructure/config";
import { database, auditAction } from "./common";
import { authorize, BusinessError, type Actor } from "./rules";
const input = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.email().transform((v) => v.toLowerCase()),
    roles: z
      .array(z.enum(["customer_operator", "customer_finance"]))
      .min(1)
      .max(2),
  })
  .strict();
export async function inviteCustomer(
  actor: Actor,
  customerId: string,
  value: unknown,
) {
  authorize(actor, "admin", customerId);
  const d = input.parse(value),
    db = database();
  const [c] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId));
  if (!c || c.status !== "active")
    throw new BusinessError("CUSTOMER_FROZEN", "客户不存在或已冻结", 403);
  const [staffInvite] = await db
    .select({ id: staffInvitations.id })
    .from(staffInvitations)
    .where(eq(staffInvitations.email, d.email));
  if (staffInvite)
    throw new BusinessError("EMAIL_IN_USE", "此邮箱已用于内部员工账号", 409);
  const [prior] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.email, d.email));
  if (prior && prior.customerId !== customerId)
    throw new BusinessError(
      "EMAIL_IN_USE",
      "此邮箱已有其他客户的邀请记录",
      409,
    );
  const lookup = await db.execute(
    sql`select app.user_id_for_email(${d.email}) as id`,
  );
  let userId = lookup[0]?.id as string | undefined;
  if (userId) {
    const [existing] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, userId));
    if (
      existing &&
      (existing.identity !== "customer" || existing.customerId !== customerId)
    )
      throw new BusinessError("EMAIL_IN_USE", "此邮箱已属于其他账号", 409);
  }
  const [record] = prior
    ? [prior]
    : await db
        .insert(invitations)
        .values({ ...d, customerId, createdBy: actor.id })
        .returning();
  const alreadyExists = !!userId;
  try {
    if (!userId) {
      const { data, error } = await adminClient().auth.admin.inviteUserByEmail(
        d.email,
        { redirectTo: `${readConfig().origin}/auth/setup` },
      );
      if (error || !data.user)
        throw new BusinessError(
          "INVITE_FAILED",
          "邀请发送失败，请检查邮件服务或稍后重试",
          502,
        );
      userId = data.user.id;
    }
    // Persist the Auth reference before provisioning, so interruption can be reconciled.
    await db
      .update(invitations)
      .set({ userId, status: "pending", errorCode: null })
      .where(eq(invitations.id, record.id));
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(profiles)
        .where(eq(profiles.id, userId!));
      if (
        existing &&
        (existing.identity !== "customer" || existing.customerId !== customerId)
      )
        throw new BusinessError("EMAIL_IN_USE", "此邮箱已属于其他账号", 409);
      if (!existing)
        await tx.insert(profiles).values({
          id: userId!,
          name: record.name,
          identity: "customer",
          customerId,
          roles: record.roles,
        });
      await auditAction(
        tx,
        actor,
        "customer.invite.provision",
        customerId,
        record.id,
      );
    });
    if (alreadyExists) {
      const { error } = await adminClient().auth.resetPasswordForEmail(
        d.email,
        { redirectTo: `${readConfig().origin}/auth/setup` },
      );
      if (error)
        throw new BusinessError(
          "INVITE_FAILED",
          "密码设置邮件发送失败，账号信息已保留，可稍后重试",
          502,
        );
    }
    await db
      .update(invitations)
      .set({ status: "sent", errorCode: null })
      .where(eq(invitations.id, record.id));
  } catch (e) {
    await db
      .update(invitations)
      .set({
        status: "failed",
        userId: userId ?? null,
        errorCode: "PROVISION_OR_SEND_FAILED",
      })
      .where(eq(invitations.id, record.id));
    throw e;
  }

  return { id: record.id, status: "sent" };
}
export async function listInvitations(actor: Actor, customerId: string) {
  authorize(actor, "admin", customerId);
  return database()
    .select()
    .from(invitations)
    .where(eq(invitations.customerId, customerId));
}
