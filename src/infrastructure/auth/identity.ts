import "server-only";
import { sql } from "drizzle-orm";
import { sessionClient } from "./supabase";
import { getDatabase } from "../database/client";
import { BusinessError } from "@/modules/business/rules";
export type VerifiedIdentity = { id: string; email: string };
export async function requireSessionIdentity(): Promise<{ id: string }> {
  const client = await sessionClient();
  const { data, error } = await client.auth.getClaims();
  const c = data?.claims;
  if (error || !c?.sub || typeof c.session_id !== "string")
    throw new BusinessError("UNAUTHENTICATED", "请先登录", 401);
  const rows = await getDatabase().execute(
    sql`select app.session_active(${c.sub}::uuid,${c.session_id}::uuid) as active`,
  );
  if (!rows[0]?.active)
    throw new BusinessError("UNAUTHENTICATED", "登录已失效，请重新登录", 401);
  return { id: c.sub };
}
export async function requireVerifiedIdentity(): Promise<VerifiedIdentity> {
  const identity = await requireSessionIdentity();
  const { data, error } = await (await sessionClient()).auth.getUser();
  if (error || data.user?.id !== identity.id)
    throw new BusinessError("UNAUTHENTICATED", "请重新登录", 401);
  if (!data.user.email || !data.user.email_confirmed_at)
    throw new BusinessError("EMAIL_UNVERIFIED", "请先验证邮箱", 403);
  return { id: identity.id, email: data.user.email.toLowerCase() };
}
