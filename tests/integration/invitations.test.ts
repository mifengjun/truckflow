import { beforeAll, afterAll, it, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createActors } from "../helpers/actors";
import { adminDb } from "../helpers/database";
import { getDatabase } from "@/infrastructure/database/client";
const mocks = vi.hoisted(() => ({ invite: vi.fn(), recover: vi.fn() }));
vi.mock("@/infrastructure/auth/supabase", () => ({
  adminClient: () => ({
    auth: {
      admin: { inviteUserByEmail: mocks.invite },
      resetPasswordForEmail: mocks.recover,
    },
  }),
}));
import { inviteCustomer } from "@/modules/business/invitations";
let actors: Awaited<ReturnType<typeof createActors>>;
const auth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);
const email = `invite-qa-${randomUUID()}@example.invalid`;
let userId = "";
beforeAll(async () => {
  actors = await createActors();
  mocks.invite.mockImplementation(async () => {
    const result = await auth.auth.admin.createUser({
      email,
      password: randomUUID() + "Aa1!",
      email_confirm: true,
    });
    userId = result.data.user!.id;
    return result;
  });
  mocks.recover.mockResolvedValue({ data: {}, error: null });
});
afterAll(async () => {
  vi.restoreAllMocks();
  if (userId) {
    await adminDb`delete from app.audit_events where resource_id in(select id from app.invitations where email=${email})`;
    await adminDb`delete from app.invitations where email=${email}`;
    await adminDb`delete from app.profiles where id=${userId}`;
    await auth.auth.admin.deleteUser(userId);
  }
  if (actors) await actors.cleanup();
  await adminDb.end();
});
it("recovers an invitation after Auth succeeded but profile transaction failed, and resends expired invitations", async () => {
  const d = { email, name: "TEST Invited", roles: ["customer_operator"] };
  vi.spyOn(getDatabase(), "transaction").mockRejectedValueOnce(
    new Error("TEST injected profile transaction failure"),
  );
  await expect(
    inviteCustomer(actors.staff, actors.a.customerId!, d),
  ).rejects.toBeDefined();
  const result = await inviteCustomer(actors.staff, actors.a.customerId!, d);
  expect(result.status).toBe("sent");
  const [profile] =
    await adminDb`select customer_id from app.profiles where id=${userId}`;
  expect(profile.customer_id).toBe(actors.a.customerId);
  await expect(
    inviteCustomer(actors.staff, actors.a.customerId!, d),
  ).resolves.toMatchObject({ status: "sent" });
  expect(mocks.invite).toHaveBeenCalledTimes(1);
  expect(mocks.recover).toHaveBeenCalled();
  await expect(
    inviteCustomer(actors.staff, actors.b.customerId!, d),
  ).rejects.toMatchObject({ status: 409 });
});
