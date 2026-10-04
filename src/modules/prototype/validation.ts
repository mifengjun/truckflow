import { z } from "zod";
import { addressSchema, draftShape, goodsSchema } from "./model";
const positive = z
  .number({ error: "请输入有效数字" })
  .positive("必须大于 0")
  .max(1000000, "数值过大，请核对");
const address = addressSchema.extend({
  name: z.string().trim().min(1, "请填写名称"),
  contact: z.string().trim().min(1, "请填写联系人及电话"),
  address: z.string().trim().min(8, "请填写完整地址（至少 8 个字符）"),
});
export const inquirySchema = draftShape.extend({
  origin: address,
  destination: address,
  date: z.string().min(1, "请选择提货日期"),
  goods: z
    .array(
      goodsSchema.extend({
        name: z.string().trim().min(1, "请填写品名"),
        quantity: positive.int("数量须为整数"),
        weight: positive,
        value: z.number().nonnegative("货值不能为负数"),
      }),
    )
    .min(1, "至少添加一种货物"),
  pallets: positive.int("托盘数量须为整数"),
  length: positive,
  width: positive,
  height: positive,
  palletWeight: z.number().nonnegative("包装重量不能为负数"),
});
