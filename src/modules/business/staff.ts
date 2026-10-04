import "server-only";
import { staffNeedsPassword } from "./staff-password";
import { and, eq, inArray, isNull, desc, ilike, sql } from "drizzle-orm";
import {
  profiles,
  staffAccess,
  staffInvitations,
  customers,
  invitations,
} from "@/infrastructure/database/schema";
import type { Transaction } from "@/infrastructure/database/client";
import { database, auditAction } from "./common";
import { BusinessError, homeForActor, type Actor } from "./rules";
import {
  staffCreateInput,
  staffUpdateInput,
  protectLastAdministrator,
  isGlobalAdministrator,
  type StaffDetails,
} from "./staff-contracts";
import { listStaffAccounts } from "./customers";
import { ensureStaffIdentity, sendStaffSetupEmail } from "./staff-delivery";
export async function countUsableAdministrators(
  db: Pick<ReturnType<typeof database>, "execute"> = database(),
) {
  const rows = await db.execute(
    sql`select count(*)::int as n from app.profiles where identity='staff' and active and all_customers and 'admin'=any(roles) and (not exists(select 1 from app.staff_invitations i where i.id=profiles.id) or exists(select 1 from app.registration_passwords r where r.user_id=profiles.id))`,
  );
  return Number(rows[0].n);
}
export function requireStaffAdministrator(actor: Actor) {
  if (
    actor.identity !== "staff" ||
    !actor.allCustomers ||
    !actor.roles.includes("admin")
  )
    throw new BusinessError("FORBIDDEN", "仅全局管理员可管理员工账号", 403);
}
async function lockedAdministrator(tx: Transaction, actor: Actor) {
  requireStaffAdministrator(actor);
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended('truckflow.staff-administration',0))`,
  );
  const [current] = await tx
    .select()
    .from(profiles)
    .where(eq(profiles.id, actor.id));
  if (
    !current ||
    current.identity !== "staff" ||
    !isGlobalAdministrator(current) ||
    (await staffNeedsPassword(actor.id, tx))
  )
    throw new BusinessError(
      "FORBIDDEN",
      "你的管理员权限已变更，请刷新页面",
      403,
    );
}
async function validateCustomers(tx: Transaction, ids: string[]) {
  if (!ids.length) return;
  const rows = await tx
    .select({ id: customers.id })
    .from(customers)
    .where(inArray(customers.id, ids));
  if (rows.length !== ids.length)
    throw new BusinessError(
      "CUSTOMER_MISSING",
      "部分客户已不存在，请重新选择",
      422,
    );
}
async function assignCustomers(
  tx: Transaction,
  id: string,
  details: StaffDetails,
) {
  await tx.delete(staffAccess).where(eq(staffAccess.staffId, id));
  if (details.customerIds.length)
    await tx
      .insert(staffAccess)
      .values(
        details.customerIds.map((customerId) => ({ staffId: id, customerId })),
      );
}
export async function staffDirectory(actor: Actor, page: number) {
  const result = await listStaffAccounts(actor, page);
  const ids = result.items.map((p) => p.id);
  if (!ids.length) return result;
  const access = await database()
    .select()
    .from(staffAccess)
    .where(inArray(staffAccess.staffId, ids));
  const invites = await database()
    .select({ id: staffInvitations.id, status: staffInvitations.status })
    .from(staffInvitations)
    .where(inArray(staffInvitations.id, ids));
  return {
    ...result,
    items: result.items.map((p) => ({
      ...p,
      customerIds: access
        .filter((a) => a.staffId === p.id)
        .map((a) => a.customerId),
      invitationStatus: invites.find((i) => i.id === p.id)?.status ?? null,
    })),
  };
}
export async function customerOptions(
  actor: Actor,
  search: string,
  page: number,
) {
  requireStaffAdministrator(actor);
  if (
    search.length > 100 ||
    !Number.isSafeInteger(page) ||
    page < 0 ||
    page > 10000
  )
    throw new BusinessError("INVALID_QUERY", "查询条件无效", 422);
  const escaped = search.replace(/[\\%_]/g, "\\$&");
  const rows = await database()
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(ilike(customers.name, `%${escaped}%`))
    .orderBy(customers.name, customers.id)
    .limit(26)
    .offset(page * 25);
  return { items: rows.slice(0, 25), hasMore: rows.length > 25 };
}
export async function staffDetail(actor: Actor, id: string) {
  requireStaffAdministrator(actor);
  const [p] = await database()
    .select()
    .from(profiles)
    .where(and(eq(profiles.id, id), eq(profiles.identity, "staff")));
  if (!p) throw new BusinessError("NOT_FOUND", "员工不存在", 404);
  const assigned = await database()
    .select({ id: customers.id, name: customers.name })
    .from(staffAccess)
    .innerJoin(customers, eq(customers.id, staffAccess.customerId))
    .where(eq(staffAccess.staffId, id));
  return { ...p, assigned };
}
export async function pendingStaffInvitations(actor: Actor, page: number) {
  requireStaffAdministrator(actor);
  const rows = await database()
    .select({
      id: staffInvitations.id,
      email: staffInvitations.email,
      details: staffInvitations.details,
      status: staffInvitations.status,
    })
    .from(staffInvitations)
    .leftJoin(profiles, eq(profiles.id, staffInvitations.id))
    .where(isNull(profiles.id))
    .orderBy(desc(staffInvitations.createdAt), staffInvitations.id)
    .limit(26)
    .offset(page * 25);
  return { items: rows.slice(0, 25), hasMore: rows.length > 25 };
}
export async function createStaff(actor: Actor, value: unknown) {
  requireStaffAdministrator(actor);
  const { email, ...details } = staffCreateInput.parse(value);
  const record = await database().transaction(async (tx) => {
    await lockedAdministrator(tx, actor);
    await validateCustomers(tx, details.customerIds);
    const existing = await tx.execute(
      sql`select app.user_id_for_email(${email}) as id`,
    );
    const [customerInvite] = await tx
      .select({ id: invitations.id })
      .from(invitations)
      .where(eq(invitations.email, email));
    const [staffInvite] = await tx
      .select({ id: staffInvitations.id })
      .from(staffInvitations)
      .where(eq(staffInvitations.email, email));
    if (existing[0]?.id || customerInvite || staffInvite)
      throw new BusinessError(
        "EMAIL_IN_USE",
        "此邮箱已有账号或邀请，请使用现有记录重试，或更换邮箱",
        409,
      );
    const [r] = await tx
      .insert(staffInvitations)
      .values({ email, details, createdBy: actor.id })
      .returning();
    await auditAction(tx, actor, "staff.invite.create", null, r.id);
    return r;
  });
  return retryStaffInvitation(actor, record.id);
}
export async function retryStaffInvitation(actor: Actor, id: string) {
  requireStaffAdministrator(actor);
  // Provision first and commit before delivering a link. Failures retain a retryable reservation.
  try {
    await database().transaction(async (tx) => {
      await lockedAdministrator(tx, actor);
      const [r] = await tx
        .select()
        .from(staffInvitations)
        .where(eq(staffInvitations.id, id));
      if (!r) throw new BusinessError("NOT_FOUND", "邀请记录不存在", 404);
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${id},0))`,
      );
      const [p] = await tx.select().from(profiles).where(eq(profiles.id, id));
      if (p && (p.identity !== "staff" || !p.active))
        throw new BusinessError(
          "ACCOUNT_DISABLED",
          "该账号已停用，不能发送设置密码邮件",
          409,
        );
      await ensureStaffIdentity(id, r.email);
      if (!p) {
        await validateCustomers(tx, r.details.customerIds);
        await tx.insert(profiles).values({
          id,
          name: r.details.name,
          roles: r.details.roles,
          allCustomers: r.details.allCustomers,
          identity: "staff",
        });
        await assignCustomers(tx, id, r.details);
        await auditAction(tx, actor, "staff.create", null, id);
      }
    });
    await database().transaction(async (tx) => {
      await lockedAdministrator(tx, actor);
      const [p] = await tx.select().from(profiles).where(eq(profiles.id, id));
      const [r] = await tx
        .select()
        .from(staffInvitations)
        .where(eq(staffInvitations.id, id));
      if (!p?.active || !r)
        throw new BusinessError(
          "ACCOUNT_DISABLED",
          "账号已停用，不能发送邮件",
          409,
        );
      await sendStaffSetupEmail(r.email);
      await tx
        .update(staffInvitations)
        .set({ status: "sent", errorCode: null })
        .where(eq(staffInvitations.id, id));
      await auditAction(tx, actor, "staff.invite.sent", null, id);
    });
    return {
      id,
      status: "sent",
      message: "员工账号已建立，设置密码邮件已发送。",
    };
  } catch (e) {
    if (e instanceof BusinessError && e.status < 500) throw e;
    await database().transaction(async (tx) => {
      await lockedAdministrator(tx, actor);
      await tx
        .update(staffInvitations)
        .set({ status: "failed", errorCode: "PROVISION_OR_SEND_FAILED" })
        .where(eq(staffInvitations.id, id));
      await auditAction(tx, actor, "staff.invite.failed", null, id);
    });
    return {
      id,
      status: "failed",
      message: "员工邀请未完成，记录已保留，请在列表中重试。",
    };
  }
}
export async function updateStaff(actor: Actor, id: string, value: unknown) {
  requireStaffAdministrator(actor);
  const { expectedVersion, ...d } = staffUpdateInput.parse(value);
  return database().transaction(async (tx) => {
    await lockedAdministrator(tx, actor);
    const [p] = await tx
      .select()
      .from(profiles)
      .where(and(eq(profiles.id, id), eq(profiles.identity, "staff")))
      .for("update");
    if (!p) throw new BusinessError("NOT_FOUND", "员工不存在", 404);
    if (p.version !== expectedVersion)
      throw new BusinessError(
        "VERSION_CONFLICT",
        "此员工资料已更新，请刷新列表后重试",
        409,
      );
    const total = await countUsableAdministrators(tx);
    protectLastAdministrator(
      { ...p, active: p.active && !(await staffNeedsPassword(id, tx)) },
      d,
      total,
    );
    await validateCustomers(tx, d.customerIds);
    const [result] = await tx
      .update(profiles)
      .set({
        name: d.name,
        roles: d.roles,
        allCustomers: d.allCustomers,
        active: d.active,
        version: expectedVersion + 1,
      })
      .where(eq(profiles.id, id))
      .returning();
    await assignCustomers(tx, id, d);
    await auditAction(
      tx,
      actor,
      !d.active && p.active
        ? "staff.disable"
        : d.active && !p.active
          ? "staff.enable"
          : "staff.permissions.update",
      null,
      id,
    );
    return {
      ...result,
      destination:
        id === actor.id
          ? d.active
            ? homeForActor({ ...actor, ...d })
            : "/login"
          : null,
    };
  });
}
