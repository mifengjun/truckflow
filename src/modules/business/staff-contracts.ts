import { z } from "zod";
import { BusinessError } from "./rules";
export const staffRoles = [
  "operations",
  "finance",
  "admin",
  "cost_view",
] as const;
export const staffRoleLabels = {
  operations: "运营",
  finance: "财务",
  admin: "管理员",
  cost_view: "成本查看",
};
const fields = {
  name: z.string().trim().min(1).max(100),
  roles: z
    .array(z.enum(staffRoles))
    .min(1)
    .max(4)
    .refine(
      (v) => new Set(v).size === v.length && v.some((r) => r !== "cost_view"),
      "至少选择运营、财务或管理员之一",
    ),
  allCustomers: z.boolean(),
  customerIds: z
    .array(z.uuid())
    .max(1000)
    .refine((v) => new Set(v).size === v.length, "客户不可重复"),
};
function validScope(v: { allCustomers: boolean; customerIds: string[] }) {
  return v.allCustomers ? v.customerIds.length === 0 : v.customerIds.length > 0;
}
export const staffDetailsInput = z
  .object(fields)
  .strict()
  .refine(validScope, "请选择全部客户或至少一个指定客户");
export const staffCreateInput = z
  .object({ ...fields, email: z.email().transform((v) => v.toLowerCase()) })
  .strict()
  .refine(validScope, "请选择全部客户或至少一个指定客户");
export const staffUpdateInput = z
  .object({
    ...fields,
    active: z.boolean(),
    expectedVersion: z.number().int().positive(),
  })
  .strict()
  .refine(validScope, "请选择全部客户或至少一个指定客户");
export type StaffDetails = z.infer<typeof staffDetailsInput>;
type Privileges = { active: boolean; allCustomers: boolean; roles: string[] };
export const isGlobalAdministrator = (p: Privileges) =>
  p.active && p.allCustomers && p.roles.includes("admin");
export function protectLastAdministrator(
  before: Privileges,
  after: Privileges,
  count: number,
) {
  if (
    isGlobalAdministrator(before) &&
    !isGlobalAdministrator(after) &&
    count <= 1
  )
    throw new BusinessError(
      "LAST_ADMIN",
      "不能停用或撤销最后一个全局管理员的权限",
      409,
    );
}
