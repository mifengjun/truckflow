import { beforeAll, afterAll, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createActors } from "../helpers/actors";
import { adminDb } from "../helpers/database";
const origin = process.env.APP_ORIGIN!;
let actors: Awaited<ReturnType<typeof createActors>>;
let cookies = "",
  proofId = "",
  paths: string[] = [];
async function request(
  path: string,
  method = "GET",
  data?: unknown,
  cookie = cookies,
  requestOrigin = origin,
) {
  return fetch(`${origin}/api/v1/${path}`, {
    method,
    headers: {
      cookie,
      ...(method !== "GET"
        ? {
            origin: requestOrigin,
            ...(data instanceof FormData
              ? {}
              : { "content-type": "application/json" }),
          }
        : {}),
    },
    body:
      method === "GET"
        ? undefined
        : data instanceof FormData
          ? data
          : JSON.stringify(data ?? {}),
  });
}
beforeAll(async () => {
  actors = await createActors();
});
afterAll(async () => {
  if (actors) {
    const rows =
      await adminDb`select storage_path from app.attachments where customer_id=${actors.a.customerId!}`;
    paths = rows.map((r) => r.storage_path);
    if (paths.length)
      await createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!,
      )
        .storage.from("business-documents")
        .remove(paths);
    await actors.cleanup();
  }
  await adminDb.end();
});
it("rejects anonymous and cross-origin mutations", async () => {
  expect((await request("me", "GET", undefined, "")).status).toBe(401);
  expect(
    (
      await request(
        "auth/login",
        "POST",
        actors.credentials[0],
        "",
        "https://untrusted.example",
      )
    ).status,
  ).toBe(403);
});
it("sets real cookies and checks current profile on every request", async () => {
  const response = await request(
    "auth/login",
    "POST",
    actors.credentials[0],
    "",
  );
  expect(response.status).toBe(200);
  cookies = response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  expect(cookies).toContain("sb-");
  expect((await request("me")).status).toBe(200);
  await adminDb`update app.profiles set active=false where id=${actors.a.id}`;
  expect((await request("me")).status).toBe(403);
  await adminDb`update app.profiles set active=true where id=${actors.a.id}`;
});
it("uploads a private proof and rejects forbidden scope and invalid files", async () => {
  const form = new FormData();
  form.set("kind", "recharge_proof");
  form.set(
    "file",
    new Blob(["%PDF-1.4\nTEST QA transfer proof\n%%EOF"], {
      type: "application/pdf",
    }),
    "TEST-QA-proof.pdf",
  );
  const response = await request("attachments", "POST", form);
  expect(response.status).toBe(201);
  proofId = (await response.json()).id;
  const url = await request(`attachments/${proofId}/download`);
  expect(url.status).toBe(200);
  const [record] =
    await adminDb`select storage_path from app.attachments where id=${proofId}`;
  const publicRead = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/business-documents/${record.storage_path}`,
  );
  expect(publicRead.ok).toBe(false);
  const invalid = new FormData();
  invalid.set("kind", "recharge_proof");
  invalid.set(
    "file",
    new Blob(["invalid executable content"], { type: "application/pdf" }),
    "forged.pdf",
  );
  expect((await request("attachments", "POST", invalid)).status).toBe(422);
  const other = await request("auth/login", "POST", actors.credentials[1], "");
  const otherCookies = other.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  expect(
    (
      await request(
        `attachments/${proofId}/download`,
        "GET",
        undefined,
        otherCookies,
      )
    ).status,
  ).toBe(404);
});
it("rejects invalid IDs and finance access without finance role", async () => {
  expect((await request("orders/invalid-id")).status).toBe(422);
  await adminDb`update app.profiles set roles=array['customer_operator'] where id=${actors.a.id}`;
  expect((await request("account")).status).toBe(403);
  expect((await request("funds")).status).toBe(200);
  await adminDb`update app.profiles set roles=array['customer_operator','customer_finance'] where id=${actors.a.id}`;
});
it("revokes session so old cookies cannot be reused after logout", async () => {
  expect((await request("auth/logout", "POST")).status).toBe(200);
  expect((await request("me")).status).toBe(401);
});
