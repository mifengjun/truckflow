import { beforeAll, afterAll, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { createActors } from "../helpers/actors";
import { adminDb } from "../helpers/database";
import { adminClient } from "@/infrastructure/auth/supabase";
import {
  createStaff,
  updateStaff,
  retryStaffInvitation,
  staffDirectory,
  customerOptions,
  countUsableAdministrators,
} from "@/modules/business/staff";
import * as delivery from "@/modules/business/staff-delivery";
import { requireActor } from "@/infrastructure/auth/actor";
const session = vi.hoisted(() => ({ id: "" }));
vi.mock("@/infrastructure/auth/identity", () => ({
  requireSessionIdentity: async () => ({ id: session.id }),
}));
let actors: Awaited<ReturnType<typeof createActors>>;
let staffId: string;
const email = `staff-qa-${randomUUID()}@example.invalid`;
const send = vi.spyOn(delivery, "sendStaffSetupEmail").mockResolvedValue();
beforeAll(async () => {
  actors = await createActors();
}, 60000);
afterAll(async () => {
  send.mockRestore();
  if (actors) {
    const records =
      await adminDb`select id from app.staff_invitations where created_by=${actors.staff.id}`;
    for (const r of records) {
      await adminDb`delete from app.staff_customer_access where staff_id=${r.id}`;
      await adminDb`delete from app.audit_events where actor_id=${r.id}`;
      await adminDb`delete from app.profiles where id=${r.id}`;
      await adminClient().auth.admin.deleteUser(r.id);
    }
    await adminDb`delete from app.staff_invitations where created_by=${actors.staff.id}`;
    await actors.cleanup();
  }
  await adminDb.end();
}, 60000);
it("reserves an employee, retains mail failures and retries without duplicating or changing permissions", async () => {
  send.mockRejectedValueOnce(new Error("mail unavailable"));
  const result = await createStaff(actors.staff, {
    name: "TEST Employee",
    email,
    roles: ["operations"],
    allCustomers: false,
    customerIds: [actors.a.customerId!],
  });
  staffId = result.id;
  expect(result.status).toBe("failed");
  const [profile] =
    await adminDb`select * from app.profiles where id=${staffId}`;
  expect(profile).toMatchObject({
    identity: "staff",
    roles: ["operations"],
    all_customers: false,
  });
  const user = await adminClient().auth.admin.getUserById(staffId);
  expect(user.data.user?.email_confirmed_at).toBeFalsy();
  expect((await retryStaffInvitation(actors.staff, staffId)).status).toBe(
    "sent",
  );
  expect(send).toHaveBeenCalledTimes(2);
  session.id = staffId;
  await expect(requireActor()).rejects.toMatchObject({
    code: "PASSWORD_REQUIRED",
  });
  const listing = await staffDirectory(actors.staff, 0);
  expect(listing.items.find((p) => p.id === staffId)).toMatchObject({
    email,
    customerIds: [actors.a.customerId],
    invitationStatus: "sent",
  });
}, 60000);
it("supports searching customers and setting the first employee password through a recovery link", async () => {
  const options = await customerOptions(actors.staff, "TEST QA", 0);
  expect(options.items.some((c) => c.id === actors.a.customerId)).toBe(true);
  const auth = adminClient().auth;
  const link = await auth.admin.generateLink({ type: "recovery", email });
  expect(link.error).toBeNull();
  const accepted = await auth.verifyOtp({
    type: "recovery",
    token_hash: link.data.properties!.hashed_token,
  });
  expect(accepted.error).toBeNull();
  expect(accepted.data.user?.email_confirmed_at).toBeTruthy();
  const password = randomUUID() + "Aa1!";
  expect((await auth.updateUser({ password })).error).toBeNull();
  expect(
    (await auth.signInWithPassword({ email, password })).data.user?.id,
  ).toBe(staffId);
}, 60000);

it("rejects customer/scoped actors, duplicate mail and existing customer accounts", async () => {
  const input = {
    name: "TEST Employee",
    email,
    roles: ["operations"],
    allCustomers: true,
    customerIds: [],
  };
  await expect(createStaff(actors.a, input)).rejects.toMatchObject({
    status: 403,
  });
  await expect(
    createStaff({ ...actors.staff, allCustomers: false }, input),
  ).rejects.toMatchObject({ status: 403 });
  await expect(createStaff(actors.staff, input)).rejects.toMatchObject({
    status: 409,
  });
  await expect(
    createStaff(actors.staff, { ...input, email: actors.credentials[0].email }),
  ).rejects.toMatchObject({ status: 409 });
});
it("updates role/scope and immediately denies a disabled employee on the next request", async () => {
  const d = {
    name: "TEST Updated",
    roles: ["finance"],
    allCustomers: false,
    customerIds: [actors.b.customerId!],
    active: true,
    expectedVersion: 1,
  };
  await updateStaff(actors.staff, staffId, d);
  session.id = staffId;
  expect(await requireActor()).toMatchObject({
    roles: ["finance"],
    customerIds: [actors.b.customerId],
  });
  await expect(updateStaff(actors.staff, staffId, d)).rejects.toMatchObject({
    status: 409,
  });
  await updateStaff(actors.staff, staffId, {
    ...d,
    expectedVersion: 2,
    active: false,
  });
  await expect(requireActor()).rejects.toMatchObject({
    code: "ACCOUNT_DISABLED",
  });
  const sent = send.mock.calls.length;
  await expect(
    retryStaffInvitation(actors.staff, staffId),
  ).rejects.toMatchObject({ status: 409 });
  expect(send.mock.calls.length).toBe(sent);
  await updateStaff(actors.staff, staffId, {
    ...d,
    expectedVersion: 3,
    active: true,
  });
  expect((await requireActor()).roles).toEqual(["finance"]);
  await retryStaffInvitation(actors.staff, staffId);
  expect((await requireActor()).roles).toEqual(["finance"]);
}, 60000);
it("serializes concurrent edits and rejects a stale administrator after permissions are revoked", async () => {
  const d = {
    name: "TEST Admin",
    roles: ["admin"],
    allCustomers: true,
    customerIds: [],
    active: true,
    expectedVersion: 4,
  };
  const results = await Promise.allSettled([
    updateStaff(actors.staff, staffId, d),
    updateStaff(actors.staff, staffId, d),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const stale = await requireActor();
  await updateStaff(actors.staff, staffId, {
    ...d,
    roles: ["operations"],
    expectedVersion: 5,
  });
  await expect(
    updateStaff(stale, actors.staff.id, {
      ...d,
      active: false,
      expectedVersion: 1,
    }),
  ).rejects.toMatchObject({ status: 403 });
});
it("recovers an interrupted Auth provisioning attempt using the same reserved UUID", async () => {
  const baseline = await countUsableAdministrators();
  const retryEmail = `staff-retry-${randomUUID()}@example.invalid`;
  const ensure = delivery.ensureStaffIdentity;
  const interrupted = vi
    .spyOn(delivery, "ensureStaffIdentity")
    .mockImplementationOnce(async (id, address) => {
      await ensure(id, address);
      throw new Error("interrupted before profile commit");
    });
  try {
    const result = await createStaff(actors.staff, {
      name: "TEST Interrupted",
      email: retryEmail,
      roles: ["admin"],
      allCustomers: true,
      customerIds: [],
    });
    expect(result.status).toBe("failed");
    expect(
      await adminDb`select id from app.profiles where id=${result.id}`,
    ).toHaveLength(0);
    expect(
      (await adminClient().auth.admin.getUserById(result.id)).data.user?.id,
    ).toBe(result.id);
    expect((await retryStaffInvitation(actors.staff, result.id)).status).toBe(
      "sent",
    );
    expect(
      await adminDb`select id from app.profiles where id=${result.id}`,
    ).toHaveLength(1);
    expect(await countUsableAdministrators()).toBe(baseline);
    const auth = adminClient().auth;
    const link = await auth.admin.generateLink({
      type: "recovery",
      email: retryEmail,
    });
    expect(link.error).toBeNull();
    expect(
      (
        await auth.verifyOtp({
          type: "recovery",
          token_hash: link.data.properties!.hashed_token,
        })
      ).error,
    ).toBeNull();
    expect(await countUsableAdministrators()).toBe(baseline);
    expect(
      (await auth.updateUser({ password: randomUUID() + "Aa1!" })).error,
    ).toBeNull();
    expect(await countUsableAdministrators()).toBe(baseline + 1);
  } finally {
    interrupted.mockRestore();
  }
}, 60000);
