import { z } from "zod";

export const LIST_PAGE_SIZE = 20;
const optionalDate = z.union([z.iso.date(), z.literal("")]).default("");
const fields = {
  search: z.string().trim().max(100, "搜索内容最多 100 个字符").default(""),
  from: optionalDate,
  to: optionalDate,
  direction: z.enum(["asc", "desc"]).default("desc"),
};
const validRange = (query: { from: string; to: string }) =>
  !query.from || !query.to || query.from <= query.to;
export const orderListInput = z
  .object({
    ...fields,
    status: z
      .enum([
        "",
        "pending_review",
        "submitting",
        "unknown",
        "accepted",
        "failed",
      ])
      .default(""),
    sort: z
      .enum(["createdAt", "number", "amount", "pickupDate"])
      .default("createdAt"),
  })
  .refine(validRange, { message: "结束日期不能早于开始日期", path: ["to"] });
export const inquiryListInput = z
  .object({
    ...fields,
    status: z
      .enum(["", "pending", "quoted", "ordered", "no_quote"])
      .default(""),
    sort: z.enum(["createdAt", "number", "pickupDate"]).default("createdAt"),
  })
  .refine(validRange, { message: "结束日期不能早于开始日期", path: ["to"] });
export type OrderListQuery = z.infer<typeof orderListInput>;
export type InquiryListQuery = z.infer<typeof inquiryListInput>;

export function listParameters(params: URLSearchParams) {
  return Object.fromEntries(
    ["search", "status", "from", "to", "sort", "direction"].flatMap((key) => {
      const value = params.get(key);
      return value === null ? [] : [[key, value]];
    }),
  );
}

// Treat SQL wildcard characters as literal search text.
export function searchPattern(search: string) {
  return `%${search.replace(/[\\%_]/g, "\\$&")}%`;
}
