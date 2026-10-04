import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/infrastructure/database/client";
export async function staffNeedsPassword(
  id: string,
  db: Pick<ReturnType<typeof getDatabase>, "execute"> = getDatabase(),
) {
  const rows = await db.execute(
    sql`select exists(select 1 from app.staff_invitations where id=${id}::uuid) and not exists(select 1 from app.registration_passwords where user_id=${id}::uuid) as needed`,
  );
  return rows[0]?.needed === true;
}
