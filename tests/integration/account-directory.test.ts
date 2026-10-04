import { beforeAll, afterAll, expect, it } from "vitest";
import { createActors } from "../helpers/actors";
import { adminDb } from "../helpers/database";
import {
  listCustomerMembers,
  listStaffAccounts,
} from "@/modules/business/customers";
let actors: Awaited<ReturnType<typeof createActors>>;
beforeAll(async () => {
  actors = await createActors();
});
afterAll(async () => {
  if (actors) await actors.cleanup();
  await adminDb.end();
});
it("lists actual customer accounts, including accounts without invitations", async () => {
  const result = await listCustomerMembers(actors.staff, actors.a.customerId!);
  expect(result.items).toHaveLength(1);
  expect(result.items[0]).toMatchObject({
    id: actors.a.id,
    email: actors.credentials[0].email,
    identity: "customer",
  });
  expect(
    result.items.some((p) => p.id === actors.b.id || p.id === actors.staff.id),
  ).toBe(false);
});
it("keeps internal employees separate from customer members", async () => {
  const result = await listStaffAccounts(actors.staff);
  expect(result.items.every((p) => p.identity === "staff")).toBe(true);
  expect(result.items.some((p) => p.id === actors.staff.id)).toBe(true);
});
it("denies customers and scoped administrators access to internal employee accounts", async () => {
  await expect(listStaffAccounts(actors.a)).rejects.toMatchObject({
    status: 403,
  });
  await expect(
    listStaffAccounts({ ...actors.staff, allCustomers: false }),
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    listCustomerMembers(actors.a, actors.a.customerId!),
  ).rejects.toMatchObject({ status: 403 });
});
it("enforces assigned customer scope and rejects missing companies", async () => {
  const scoped = {
    ...actors.staff,
    allCustomers: false,
    customerIds: [actors.a.customerId!],
  };
  expect(
    (await listCustomerMembers(scoped, actors.a.customerId!)).items[0].id,
  ).toBe(actors.a.id);
  await expect(
    listCustomerMembers(scoped, actors.b.customerId!),
  ).rejects.toMatchObject({ status: 404 });
  await expect(
    listCustomerMembers(actors.staff, "00000000-0000-0000-0000-000000000000"),
  ).rejects.toMatchObject({ status: 404 });
});
