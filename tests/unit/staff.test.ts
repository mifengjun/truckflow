import { expect, it } from "vitest";
import {
  staffCreateInput,
  staffUpdateInput,
  protectLastAdministrator,
} from "@/modules/business/staff-contracts";
const details = {
  name: "运营同事",
  roles: ["operations"],
  allCustomers: false,
  customerIds: ["00000000-0000-4000-8000-000000000001"],
};
it("requires operational roles and an explicit valid customer scope", () => {
  expect(
    staffCreateInput.parse({ ...details, email: "Test@example.com" }).email,
  ).toBe("test@example.com");
  for (const change of [
    { roles: ["cost_view"] },
    { roles: ["customer_operator"] },
    { customerIds: [] },
    { allCustomers: true },
  ])
    expect(
      staffCreateInput.safeParse({
        ...details,
        email: "test@example.com",
        ...change,
      }).success,
    ).toBe(false);
  expect(
    staffCreateInput.safeParse({
      ...details,
      email: "test@example.com",
      allCustomers: true,
      customerIds: [],
    }).success,
  ).toBe(true);
  expect(
    staffUpdateInput.safeParse({
      ...details,
      active: true,
      expectedVersion: 1,
      email: "replace@example.com",
    }).success,
  ).toBe(false);
});
it("protects the last active global administrator across every privilege removal", () => {
  const admin = { active: true, allCustomers: true, roles: ["admin"] };
  for (const change of [
    { active: false },
    { allCustomers: false },
    { roles: ["operations"] },
  ]) {
    expect(() =>
      protectLastAdministrator(admin, { ...admin, ...change }, 1),
    ).toThrow("最后一个全局管理员");
    expect(() =>
      protectLastAdministrator(admin, { ...admin, ...change }, 2),
    ).not.toThrow();
  }
  expect(() => protectLastAdministrator(admin, admin, 1)).not.toThrow();
});
