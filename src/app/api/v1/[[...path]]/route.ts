import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { requireActor } from "@/infrastructure/auth/actor";
import { sessionClient } from "@/infrastructure/auth/supabase";
import { readConfig } from "@/infrastructure/config";
import { throttle } from "@/infrastructure/auth/throttle";
import { BusinessError } from "@/modules/business/rules";
import * as Staff from "@/modules/business/staff";
import * as Customers from "@/modules/business/customers";
import * as Addresses from "@/modules/business/addresses";
import * as Inquiry from "@/modules/business/inquiries";
import * as Orders from "@/modules/business/orders";
import {
  orderListInput,
  inquiryListInput,
  listParameters,
} from "@/modules/business/listing";
import * as Finance from "@/modules/business/finance";
import * as Invites from "@/modules/business/invitations";
import * as Files from "@/modules/business/files";
import {
  requireSessionIdentity,
  requireVerifiedIdentity,
} from "@/infrastructure/auth/identity";
import {
  completeOnboarding,
  getOnboardingState,
} from "@/modules/business/onboarding";
import {
  registerCustomer,
  resendSignupVerification,
} from "@/modules/business/registration";
import { passwordInput } from "@/modules/business/auth-contracts";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (data: unknown, status = 200) =>
  NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
const uuid = (v: string) => z.uuid().parse(v);
const versionReason = z
  .object({
    expectedVersion: z.number().int().positive(),
    reason: z.string().trim().min(2).max(2000),
  })
  .strict();
async function handler(
  req: Request,
  ctx: { params: Promise<{ path?: string[] }> },
) {
  try {
    const { path = [] } = await ctx.params,
      p = path.join("/"),
      method = req.method,
      url = new URL(req.url),
      write = method !== "GET";
    if (write) {
      if (req.headers.get("origin") !== readConfig().origin)
        throw new BusinessError("ORIGIN_REJECTED", "请求来源无效", 403);
      const len = Number(req.headers.get("content-length") ?? 0);
      if (len > 3100000)
        throw new BusinessError("BODY_TOO_LARGE", "请求内容过大", 413);
      if (
        !req.headers
          .get("content-type")
          ?.startsWith(
            p === "attachments" ? "multipart/form-data" : "application/json",
          )
      )
        throw new BusinessError("CONTENT_TYPE", "请求格式错误", 415);
    }
    const body = async () => {
      try {
        return await req.json();
      } catch {
        throw new BusinessError("INVALID_JSON", "请求内容格式错误", 400);
      }
    };
    if ((p === "auth/register" || p === "auth/resend") && method === "POST") {
      const result = await (
        p === "auth/register" ? registerCustomer : resendSignupVerification
      )(await body());
      (await cookies()).set("registration-email", result.email, {
        httpOnly: true,
        sameSite: "lax",
        secure: readConfig().origin.startsWith("https:"),
        path: "/",
        maxAge: 3600,
      });
      return reply(result);
    }
    if (p === "auth/onboarding") {
      const identity = await requireVerifiedIdentity();
      if (method === "GET") return reply(await getOnboardingState(identity));
      if (method === "POST")
        return reply(await completeOnboarding(identity, await body()));
      return notFound();
    }
    if (p === "auth/logout" && method === "POST") {
      await requireSessionIdentity();
      const { error } = await (
        await sessionClient()
      ).auth.signOut({ scope: "local" });
      if (error)
        throw new BusinessError("LOGOUT_FAILED", "退出失败，请重试", 502);
      return reply({ ok: true });
    }
    if (p === "auth/login" && method === "POST") {
      const d = z
        .object({ email: z.email(), password: z.string().min(1).max(200) })
        .strict()
        .parse(await body());
      await throttle(d.email, "login");
      const client = await sessionClient();
      const { error } = await client.auth.signInWithPassword(d);
      if (error)
        throw new BusinessError("LOGIN_FAILED", "邮箱或密码不正确", 401);
      try {
        return reply(await getOnboardingState(await requireVerifiedIdentity()));
      } catch (e) {
        await client.auth.signOut();
        throw e;
      }
    }
    if (p === "auth/recover" && method === "POST") {
      const d = z
        .object({ email: z.email() })
        .strict()
        .parse(await body());
      await throttle(d.email, "recover");
      await (
        await sessionClient()
      ).auth.resetPasswordForEmail(d.email, {
        redirectTo: `${readConfig().origin}/auth/setup`,
      });
      return reply({ message: "如邮箱已注册，将收到密码设置邮件。" });
    }
    if (p === "auth/accept" && method === "POST") {
      const d = z
        .object({
          access_token: z.string().min(20).max(10000),
          refresh_token: z.string().min(10).max(10000),
        })
        .strict()
        .parse(await body());
      const { error } = await (await sessionClient()).auth.setSession(d);
      if (error)
        throw new BusinessError(
          "INVALID_INVITE",
          "邀请已失效，请联系管理员",
          401,
        );
      const state = await getOnboardingState(await requireVerifiedIdentity());
      return reply({ ok: true, destination: state.destination });
    }
    if (p === "auth/password" && method === "POST") {
      const d = z
        .object({ password: passwordInput })
        .strict()
        .parse(await body());
      const identity = await requireVerifiedIdentity();
      const { error } = await (await sessionClient()).auth.updateUser(d);
      if (error)
        throw new BusinessError(
          "PASSWORD_FAILED",
          "密码未更新，请重试或重新获取验证邮件",
          422,
        );
      return reply(await getOnboardingState(identity));
    }
    const actor = await requireActor();
    if (p === "me" && method === "GET")
      return reply({ actor, environment: readConfig().environment });
    const page = z.coerce
      .number()
      .int()
      .min(0)
      .max(10000)
      .parse(url.searchParams.get("page") ?? 0);
    const company = url.searchParams.get("customerId");
    if (company) uuid(company);
    if (p === "staff") {
      if (method === "GET")
        return reply(await Staff.staffDirectory(actor, page));
      if (method === "POST") {
        Staff.requireStaffAdministrator(actor);
        await throttle(actor.id, "staff-invite");
        return reply(await Staff.createStaff(actor, await body()), 201);
      }
    }
    if (p === "staff/customer-options" && method === "GET")
      return reply(
        await Staff.customerOptions(
          actor,
          url.searchParams.get("search") ?? "",
          page,
        ),
      );
    if (p === "staff/invitations" && method === "GET")
      return reply(await Staff.pendingStaffInvitations(actor, page));
    if (path[0] === "staff" && path[1]) {
      const id = uuid(path[1]);
      if (path.length === 2 && method === "GET")
        return reply(await Staff.staffDetail(actor, id));
      if (path.length === 2 && method === "PATCH")
        return reply(await Staff.updateStaff(actor, id, await body()));
      if (path.length === 3 && path[2] === "invite" && method === "POST") {
        await throttle(actor.id, "staff-invite");
        return reply(await Staff.retryStaffInvitation(actor, id));
      }
    }
    if (p === "customers")
      return method === "GET"
        ? reply(await Customers.listCustomers(actor))
        : method === "POST"
          ? reply(await Customers.createCustomer(actor, await body()), 201)
          : notFound();
    if (path[0] === "customers" && path.length >= 2) {
      const id = uuid(path[1]);
      if (path.length === 2 && method === "GET")
        return reply(await Customers.getCustomer(actor, id));
      if (path.length === 2 && method === "PATCH") {
        const d = z
          .object({ status: z.enum(["active", "frozen"]) })
          .strict()
          .parse(await body());
        return reply(await Customers.setCustomerStatus(actor, id, d.status));
      }
      if (path.length === 3 && path[2] === "members" && method === "GET")
        return reply(await Customers.listCustomerMembers(actor, id, page));
      if (path[2] === "invitations")
        return method === "GET"
          ? reply(await Invites.listInvitations(actor, id))
          : method === "POST"
            ? reply(await Invites.inviteCustomer(actor, id, await body()), 201)
            : notFound();
    }
    if (p === "addresses")
      return method === "GET"
        ? reply(await Addresses.listAddresses(actor))
        : method === "POST"
          ? reply(
              await Addresses.createAddress(
                actor,
                await body(),
                company ?? undefined,
              ),
              201,
            )
          : notFound();
    if (path[0] === "addresses" && path.length === 2 && method === "PATCH") {
      const d = z
        .object({
          expectedVersion: z.number().int().positive(),
          data: z.unknown(),
        })
        .strict()
        .parse(await body());
      return reply(
        await Addresses.updateAddress(
          actor,
          uuid(path[1]),
          d.expectedVersion,
          d.data,
        ),
      );
    }
    if (p === "inquiries")
      return method === "GET"
        ? reply(
            url.searchParams.get("format") === "page"
              ? await Inquiry.getInquiryPage(
                  actor,
                  page,
                  inquiryListInput.parse(listParameters(url.searchParams)),
                )
              : await Inquiry.listInquiries(actor, page),
          )
        : method === "POST"
          ? reply(
              await Inquiry.createInquiry(
                actor,
                await body(),
                company ?? undefined,
              ),
              201,
            )
          : notFound();
    if (path[0] === "inquiries") {
      const id = uuid(path[1]);
      if (path.length === 2 && method === "GET")
        return reply(await Inquiry.getInquiry(actor, id));
      if (path[2] === "quotes" && method === "POST")
        return reply(await Inquiry.createQuote(actor, id, await body()), 201);
      if (path[2] === "no-quote" && method === "POST") {
        const d = z
          .object({ reason: z.string().trim().min(2).max(2000) })
          .strict()
          .parse(await body());
        return reply(await Inquiry.noQuote(actor, id, d.reason));
      }
    }
    if (path[0] === "quotes" && path[2] === "publish" && method === "POST")
      return reply(await Inquiry.publishQuote(actor, uuid(path[1])));
    if (p === "orders") {
      if (method === "GET")
        return reply(
          url.searchParams.get("format") === "page"
            ? await Orders.getOrderPage(
                actor,
                page,
                orderListInput.parse(listParameters(url.searchParams)),
              )
            : await Orders.listOrders(actor, page),
        );
      if (method === "POST") {
        const d = z
          .object({ quoteId: z.uuid() })
          .strict()
          .parse(await body());
        return reply(
          await Orders.createOrder(
            actor,
            d.quoteId,
            req.headers.get("Idempotency-Key") ?? "",
          ),
          201,
        );
      }
    }
    if (path[0] === "orders") {
      const id = uuid(path[1]);
      if (path.length === 2 && method === "GET")
        return reply(await Orders.getOrder(actor, id));
      if (path[2] === "start" && method === "POST") {
        const d = z
          .object({ expectedVersion: z.number().int().positive() })
          .strict()
          .parse(await body());
        return reply(await Orders.startOrder(actor, id, d.expectedVersion));
      }
      if (path[2] === "result" && method === "POST")
        return reply(await Orders.recordResult(actor, id, await body()));
      if (path[2] === "fulfillment" && method === "POST")
        return reply(await Orders.updateFulfillment(actor, id, await body()));
    }
    if (p === "funds" && method === "GET")
      return reply(await Finance.getAvailableFunds(actor));
    if (p === "account" && method === "GET")
      return reply(await Finance.getAccount(actor, company ?? undefined));
    if (p === "ledger" && method === "GET")
      return reply(await Finance.listLedger(actor, company ?? undefined, page));
    if (p === "recharges")
      return method === "GET"
        ? reply(await Finance.listRecharges(actor, page))
        : method === "POST"
          ? reply(await Finance.createRecharge(actor, await body()), 201)
          : notFound();
    if (path[0] === "recharges" && method === "POST") {
      const id = uuid(path[1]);
      if (path[2] === "verify")
        return reply(await Finance.verifyRecharge(actor, id, await body()));
      if (path[2] === "reject") {
        const d = versionReason.parse(await body());
        return reply(
          await Finance.rejectRecharge(actor, id, d.expectedVersion, d.reason),
        );
      }
    }
    if (p === "attachments" && method === "POST") {
      const form = await req.formData(),
        file = form.get("file");
      if (!(file instanceof File))
        throw new BusinessError("FILE_REQUIRED", "请选择文件", 422);
      const order = form.get("orderId");
      return reply(
        await Files.uploadFile(
          actor,
          file,
          String(form.get("kind")),
          order ? uuid(String(order)) : undefined,
        ),
        201,
      );
    }
    if (
      path[0] === "attachments" &&
      path[2] === "download" &&
      method === "GET"
    ) {
      const response = NextResponse.redirect(
        await Files.downloadFile(actor, uuid(path[1])),
        307,
      );
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
    return notFound();
  } catch (e) {
    if (e instanceof BusinessError)
      return reply({ error: e.code, message: e.message }, e.status);
    if (e instanceof ZodError)
      return reply(
        {
          error: "VALIDATION_ERROR",
          message: e.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("；"),
          fields: e.flatten(),
        },
        422,
      );
    const code =
      typeof e === "object" &&
      e !== null &&
      "cause" in e &&
      (e.cause as { code?: string })?.code;
    if (code === "23505")
      return reply(
        { error: "DUPLICATE", message: "记录已存在或已经处理，请刷新后查看。" },
        409,
      );
    console.error(
      "Business request failed",
      JSON.stringify({
        name: e instanceof Error ? e.name : "Unknown",
        path: new URL(req.url).pathname,
        code:
          code ||
          (typeof e === "object" && e !== null && "code" in e
            ? String(e.code)
            : undefined),
        constraint:
          typeof e === "object" &&
          e !== null &&
          "cause" in e &&
          typeof e.cause === "object" &&
          e.cause !== null &&
          "constraint_name" in e.cause
            ? String(e.cause.constraint_name)
            : undefined,
      }),
    );
    return reply(
      { error: "SERVER_ERROR", message: "操作未完成，请稍后重试。" },
      500,
    );
  }
}
function notFound() {
  return reply({ error: "NOT_FOUND", message: "接口不存在" }, 404);
}
export const GET = handler;
export const POST = handler;
export const PATCH = handler;
