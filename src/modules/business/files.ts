import "server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { attachments, orders } from "@/infrastructure/database/schema";
import { adminClient } from "@/infrastructure/auth/supabase";
import { database, mustAccess, auditAction } from "./common";
import { authorize, BusinessError, type Actor } from "./rules";
export const bucket = "business-documents";
export function detectFile(bytes: Uint8Array) {
  if (
    bytes.length >= 5 &&
    String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-"
  )
    return { mime: "application/pdf", ext: "pdf" };
  if (
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)
  )
    return { mime: "image/png", ext: "png" };
  if (
    bytes.length >= 3 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    return { mime: "image/jpeg", ext: "jpg" };
  throw new BusinessError("FILE_TYPE", "仅接受 PDF、PNG、JPEG 文件", 422);
}
export async function uploadFile(
  actor: Actor,
  file: File,
  kind: string,
  orderId?: string,
) {
  if (file.size === 0 || file.size > 3000000)
    throw new BusinessError("FILE_SIZE", "文件须大于零且不超过 3 MB", 422);
  let customerId = actor.customerId;
  if (kind === "recharge_proof") {
    if (actor.identity !== "customer")
      throw new BusinessError("FORBIDDEN", "请由客户提交凭证", 403);
    authorize(actor, "customer_finance", customerId!);
  } else {
    authorize(actor, "operations");
    if (!orderId || !["BOL", "POD", "other"].includes(kind))
      throw new BusinessError("FILE_PURPOSE", "请选择订单和文档类型", 422);
    const [order] = await database()
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    if (!order) throw new BusinessError("NOT_FOUND", "订单不存在", 404);
    mustAccess(actor, order.customerId);
    customerId = order.customerId;
  }
  const bytes = new Uint8Array(await file.arrayBuffer()),
    format = detectFile(bytes),
    id = randomUUID(),
    path = `${customerId}/${id}.${format.ext}`,
    client = adminClient();
  const { error } = await client.storage
    .from(bucket)
    .upload(path, bytes, { contentType: format.mime, upsert: false });
  if (error)
    throw new BusinessError("UPLOAD_FAILED", "文件上传失败，请重试", 502);
  try {
    await database().transaction(async (tx) => {
      await tx.insert(attachments).values({
        id,
        customerId: customerId!,
        orderId: orderId ?? null,
        kind,
        filename: file.name.replace(/[\r\n/\\]/g, "_").slice(0, 200),
        storagePath: path,
        mimeType: format.mime,
        sizeBytes: file.size,
        createdBy: actor.id,
      });
      await auditAction(tx, actor, "file.upload", customerId!, id);
    });
  } catch (e) {
    await client.storage.from(bucket).remove([path]);
    throw e;
  }
  return { id, filename: file.name, kind };
}
export async function downloadFile(actor: Actor, id: string) {
  const [a] = await database()
    .select()
    .from(attachments)
    .where(eq(attachments.id, id));
  if (!a) throw new BusinessError("NOT_FOUND", "文件不存在", 404);
  mustAccess(actor, a.customerId);
  if (a.kind === "recharge_proof") {
    authorize(actor, "customer_finance", a.customerId);
  } else {
    authorize(actor, "customer_operator", a.customerId);
    if (actor.identity === "customer" && !a.customerVisible)
      throw new BusinessError("NOT_FOUND", "文件不存在", 404);
  }
  const { data, error } = await adminClient()
    .storage.from(bucket)
    .createSignedUrl(a.storagePath, 60, { download: a.filename });
  if (error || !data)
    throw new BusinessError("DOWNLOAD_FAILED", "文件暂不可下载，请重试", 502);
  return data.signedUrl;
}
