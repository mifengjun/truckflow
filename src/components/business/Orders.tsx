"use client";
import { BusinessSection } from "./shared";
import Link from "next/link";
import type { ColumnDef, CellContext } from "@tanstack/react-table";
import { RecordTable } from "./RecordTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Field as UiField,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect, useId, useRef, type RefObject } from "react";
import { OperationPanel } from "./OperationPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  useNow,
  useData,
  useOperation,
  api,
  Heading,
  Loading,
  TextLink,
  Status,
  Empty,
  time,
  usd,
  ErrorNotice,
  Field,
} from "./shared";
import type { Inquiry, Order } from "./types";
import { Shipment } from "./Shipment";
export function OrderList({ staff = false }: { staff?: boolean }) {
  const base = staff ? "/admin" : "/portal";
  const columns: ColumnDef<Order>[] = [
    {
      accessorKey: "number",
      header: "订单号",
      enableSorting: true,
      enableHiding: false,
      cell: ({ row }) => (
        <Button variant="link" size="sm" asChild>
          <Link href={`${base}/orders/${row.original.id}`}>
            {row.original.number}
          </Link>
        </Button>
      ),
    },
    ...(staff
      ? [
          {
            id: "customer",
            header: "客户",
            cell: ({ row }: CellContext<Order, unknown>) =>
              row.original.customerName ?? "—",
          },
        ]
      : []),
    {
      id: "route",
      header: "运输线路",
      cell: ({ row }) => (
        <span>
          {row.original.snapshot.inquiry.origin.city},{" "}
          {row.original.snapshot.inquiry.origin.state} →{" "}
          {row.original.snapshot.inquiry.destination.city},{" "}
          {row.original.snapshot.inquiry.destination.state}
        </span>
      ),
    },
    {
      id: "pickupDate",
      header: "提货日期",
      enableSorting: true,
      accessorFn: (order) => order.snapshot.inquiry.pickupDate,
    },
    {
      id: "carrier",
      header: "承运商",
      accessorFn: (order) => order.snapshot.carrier,
    },
    {
      accessorKey: "amount",
      header: "金额 USD",
      enableSorting: true,
      cell: ({ row }) => (
        <span className="tabular-nums">{usd(row.original.amount)}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "订单状态",
      cell: ({ row }) => <Status value={row.original.status} />,
    },
    {
      accessorKey: "fulfillment",
      header: "运输进度",
      cell: ({ row }) => <Status value={row.original.fulfillment} />,
    },
    {
      accessorKey: "createdAt",
      header: "提交时间",
      enableSorting: true,
      cell: ({ row }) => time(row.original.createdAt),
    },
  ];
  const createAction = !staff ? (
    <Button asChild>
      <Link href="/portal/inquiry">创建询价</Link>
    </Button>
  ) : undefined;
  return (
    <>
      <Heading
        title={staff ? "订单工作台" : "订单管理"}
        description={
          staff
            ? "审核客户订单，记录承运商接单结果并更新运输进度。"
            : "跟踪订单进度，查看运输信息和运单文件。"
        }
        action={createAction}
      />
      <BusinessSection
        title="订单记录"
        description="搜索和筛选覆盖全部可访问订单。点击订单号查看详情。"
      >
        <RecordTable
          endpoint="orders"
          columns={columns}
          states={[
            { id: "pending_review", text: "待审核" },
            { id: "submitting", text: "正在下单" },
            { id: "unknown", text: "结果待核实" },
            { id: "accepted", text: "已接单" },
            { id: "failed", text: "已拒单" },
          ]}
          searchPlaceholder={
            staff
              ? "订单号、承运商、线路或客户"
              : "订单号、承运商、线路或跟踪号"
          }
          emptyTitle="暂无订单"
          emptyDescription={
            staff
              ? "客户提交订单后，可在这里审核和跟进。"
              : "提交询价并选择报价后，订单会显示在这里。"
          }
          emptyAction={createAction}
        />
      </BusinessSection>
    </>
  );
}
export function OrderConfirm({
  inquiryId,
  quoteId,
}: {
  inquiryId: string;
  quoteId: string;
}) {
  const now = useNow();
  const q = useData<Inquiry>(`inquiries/${inquiryId}`),
    funds = useData<{ available: string }>("funds"),
    operation = useOperation(),
    router = useRouter(),
    [key, setKey] = useState("");
  useEffect(() => {
    const storageKey = `order-intent:${quoteId}`;
    let value: string;
    try {
      value = sessionStorage.getItem(storageKey) || crypto.randomUUID();
      sessionStorage.setItem(storageKey, value);
    } catch {
      value = crypto.randomUUID();
    }
    queueMicrotask(() => setKey(value));
  }, [quoteId]);
  if (!q.data) return <Loading error={q.error} retry={() => q.refetch()} />;
  const i = q.data,
    t = i.quotes.find((v) => v.id === quoteId);
  if (!t)
    return <ErrorNotice message="报价不存在或不可访问，请返回询价重新选择。" />;
  const expired = Date.parse(t.expiresAt) <= now,
    enough = funds.data && Number(funds.data.available) >= Number(t.amount);
  async function submit() {
    const result = await operation.run(() =>
      api<{ id: string }>("orders", "POST", { quoteId }, key),
    );
    if (result) router.push(`/portal/orders/${result.id}`);
  }
  return (
    <>
      <Heading
        title="确认订单"
        description="核对运输信息与费用。提交后冻结运费，由运营审核并向承运商下单。"
      />
      <ErrorNotice message={operation.error} />
      {i.order && (
        <Alert>
          <AlertDescription>
            已创建订单{" "}
            <TextLink href={`/portal/orders/${i.order.id}`}>
              {i.order.number}
            </TextLink>
          </AlertDescription>
        </Alert>
      )}
      <div className="business-detail">
        <Shipment data={i.data} />
        <BusinessSection title={<>{t.carrier}</>}>
          <p className="page-description">{t.transit}</p>
          {t.fees.map((f, n) => (
            <div key={n} className="business-money-row">
              <span>{f.label}</span>
              <span>{usd(f.amount)}</span>
            </div>
          ))}
          <div className="business-money-row">
            <strong>冻结金额</strong>
            <strong>{usd(t.amount)}</strong>
          </div>
          <p className="field-hint">有效至 {time(t.expiresAt)}</p>
          <Separator className="business-rule" />
          {!funds.data ? (
            <Loading error={funds.error} retry={() => funds.refetch()} />
          ) : (
            <>
              <p>
                当前可用余额：<strong>{usd(funds.data.available)}</strong>
              </p>
              {!enough && (
                <Alert variant="warning">
                  <AlertDescription>
                    余额不足，请由具有财务权限的账号提交充值凭证，并等待财务核验。
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
          {expired && (
            <Alert variant="warning">
              <AlertDescription>报价已过期，请重新询价。</AlertDescription>
            </Alert>
          )}
          <div className="business-actions">
            <Button
              disabled={
                operation.busy || !enough || expired || !!i.order || !key
              }
              onClick={submit}
            >
              {operation.busy ? "正在提交…" : "确认并冻结运费"}
            </Button>
            <TextLink href={`/portal/inquiries/${inquiryId}`}>
              返回报价
            </TextLink>
          </div>
          <p className="field-hint">
            承运商确认接单后扣款；明确拒单后解冻；结果待核实时保持冻结。
          </p>
        </BusinessSection>
      </div>
    </>
  );
}
export function OrderDetail({
  id,
  staff = false,
}: {
  id: string;
  staff?: boolean;
}) {
  const q = useData<Order>("orders/" + id);
  const [action, setAction] = useState<"operations" | "document" | null>(null);
  const [message, setMessage] = useState("");
  const returnFocus = useRef<HTMLElement | null>(null);
  if (!q.data) return <Loading error={q.error} retry={() => q.refetch()} />;
  const o = q.data;
  const base = staff ? "/admin" : "/portal";
  return (
    <>
      <Heading
        title={o.number}
        description={"提交于 " + time(o.createdAt)}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Status value={o.status} />
            {staff && o.fulfillment !== "delivered" && (
              <Button
                onClick={(event) => {
                  returnFocus.current = event.currentTarget;
                  setAction("operations");
                }}
              >
                处理订单
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href={base + "/orders"}>返回订单列表</Link>
            </Button>
          </div>
        }
      />
      {message && (
        <Alert role="status">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {o.status === "unknown" && (
        <Alert variant="warning">
          <AlertDescription>
            承运商接单结果待核实，资金保持冻结。请等待运营核实结果。
          </AlertDescription>
        </Alert>
      )}
      {!staff && o.status !== "unknown" && (
        <Alert>
          <AlertDescription>
            {o.status === "accepted"
              ? "承运商已接单，运费已扣款。"
              : o.status === "failed"
                ? "已确认拒单，冻结运费已释放。"
                : "运费已冻结，运营正在处理订单。"}
          </AlertDescription>
        </Alert>
      )}
      <Tabs defaultValue="shipment" className="gap-6">
        <TabsList
          aria-label="订单详情"
          className="grid w-full max-w-xl grid-cols-4"
        >
          <TabsTrigger value="shipment">运输资料</TabsTrigger>
          <TabsTrigger value="fees">费用运单</TabsTrigger>
          <TabsTrigger value="documents">单据</TabsTrigger>
          <TabsTrigger value="history">处理记录</TabsTrigger>
        </TabsList>
        <TabsContent value="shipment">
          <Shipment data={o.snapshot.inquiry} />
        </TabsContent>
        <TabsContent value="fees">
          <BusinessSection title="费用与运单">
            <div className="flex flex-col gap-4">
              <strong className="text-2xl tabular-nums">{usd(o.amount)}</strong>
              <p>承运商：{o.snapshot.carrier}</p>
              <p>承运商单号：{o.externalId || "等待确认"}</p>
              <p>跟踪号：{o.tracking || "暂无"}</p>
              <p>
                运输进度：
                <Status value={o.fulfillment} />
              </p>
              <Separator />
              {o.snapshot.fees.map((f, n) => (
                <div className="business-money-row" key={n}>
                  <span>{f.label}</span>
                  <span>{usd(f.amount)}</span>
                </div>
              ))}
            </div>
          </BusinessSection>
        </TabsContent>
        <TabsContent value="documents">
          <BusinessSection
            title="订单单据"
            description="提货单、签收单及其他运输资料。"
            footer={
              staff && (
                <Button
                  onClick={(event) => {
                    returnFocus.current = event.currentTarget;
                    setMessage("");
                    setAction("document");
                  }}
                >
                  上传单据
                </Button>
              )
            }
          >
            {o.documents.length ? (
              <ul className="flex flex-col gap-4">
                {o.documents.map((d) => (
                  <li key={d.id}>
                    <a
                      className="business-link break-all"
                      href={"/api/v1/attachments/" + d.id + "/download"}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {d.kind} · {d.filename}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty
                text={
                  staff
                    ? "暂无单据，可点击上传单据"
                    : "暂无单据，运营上传后可下载"
                }
              />
            )}
          </BusinessSection>
        </TabsContent>
        <TabsContent value="history">
          <BusinessSection title="处理记录">
            {o.timeline.length ? (
              <ul className="business-timeline">
                {o.timeline.map((e) => (
                  <li key={e.id}>
                    <small className="muted">
                      {time(e.createdAt)}
                      {e.visibility === "internal" ? " · 内部依据" : ""}
                    </small>
                    <p>{e.detail}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="暂无处理记录" />
            )}
          </BusinessSection>
        </TabsContent>
      </Tabs>
      {staff && action === "operations" && (
        <OrderOperations
          order={o}
          returnFocus={returnFocus}
          onClose={() => setAction(null)}
        />
      )}
      {staff && action === "document" && (
        <DocumentUpload
          orderId={id}
          returnFocus={returnFocus}
          onClose={() => setAction(null)}
          onSaved={() => {
            setAction(null);
            setMessage("单据已上传。");
          }}
        />
      )}
    </>
  );
}
function OrderOperations({
  order,
  onClose,
  returnFocus,
}: {
  order: Order;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  // Keep the form and its expected version together across background refreshes.
  const [o, setOrder] = useState(order);
  const operation = useOperation(),
    [result, setResult] = useState("unknown");
  const next =
    o.fulfillment === "awaiting_pickup"
      ? "picked_up"
      : o.fulfillment === "picked_up"
        ? "in_transit"
        : "delivered";
  return (
    <OperationPanel
      open
      onClose={onClose}
      returnFocus={returnFocus}
      busy={operation.busy}
      title="订单处理"
      description={
        o.number + " · " + o.snapshot.carrier + " · " + usd(o.amount)
      }
      footer={
        <Button
          type="button"
          variant="outline"
          disabled={operation.busy}
          onClick={onClose}
        >
          关闭
        </Button>
      }
    >
      <ErrorNotice message={operation.error} />
      {["pending_review", "failed"].includes(o.status) && (
        <>
          <p className="page-description">
            {o.status === "failed"
              ? "重试会按原订单金额重新冻结余额，并再次检查原报价有效期。"
              : "开始处理后再联系承运商下单。"}
          </p>
          <div className="business-actions">
            <Button
              disabled={operation.busy}
              onClick={async () => {
                const started = await operation.run(() =>
                  api<{ status: string; version: number }>(
                    `orders/${o.id}/start`,
                    "POST",
                    {
                      expectedVersion: o.version,
                    },
                  ),
                );
                // Only our successful transition advances this open form.
                if (started)
                  setOrder((current) => ({ ...current, ...started }));
              }}
            >
              {operation.busy
                ? "处理中…"
                : o.status === "failed"
                  ? "重新冻结并重试"
                  : "开始人工下单"}
            </Button>
          </div>
        </>
      )}
      {["submitting", "unknown"].includes(o.status) && (
        <form
          className="business-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            const saved = await operation.run(() =>
              api(`orders/${o.id}/result`, "POST", {
                expectedVersion: o.version,
                result,
                evidence: d.get("evidence"),
                ...(result === "accepted"
                  ? {
                      externalId: d.get("externalId"),
                      tracking: d.get("tracking"),
                    }
                  : {}),
                ...(result === "failed"
                  ? { confirmedNoExternalOrder: d.get("confirmed") === "on" }
                  : {}),
              }),
            );
            if (saved) onClose();
          }}
        >
          <FieldGroup>
            <p className="page-description">
              核实承运商结果后记录。结果未知时不能再次发起下单。
            </p>
            <UiField className="form-field">
              <FieldLabel htmlFor="result">承运商结果</FieldLabel>
              <NativeSelect
                id="result"
                value={result}
                onChange={(e) => setResult(e.target.value)}
              >
                <NativeSelectOption value="unknown">
                  结果待核实（保持冻结）
                </NativeSelectOption>
                <NativeSelectOption value="accepted">
                  已接单（扣款）
                </NativeSelectOption>
                <NativeSelectOption value="failed">
                  明确拒单（解冻）
                </NativeSelectOption>
              </NativeSelect>
            </UiField>
            {result === "accepted" && (
              <>
                <Field name="externalId" label="承运商单号" />
                <Field name="tracking" label="跟踪号" required={false} />
              </>
            )}
            {result === "failed" && (
              <FieldLabel
                htmlFor="confirmed-no-order"
                className="business-check"
              >
                <Checkbox id="confirmed-no-order" name="confirmed" required />
                已核实承运商未生成订单
              </FieldLabel>
            )}
            <Field name="evidence" label="核实依据（内部可见）" minLength={2} />
            <Button disabled={operation.busy}>
              {operation.busy ? "提交中…" : "记录处理结果"}
            </Button>
          </FieldGroup>
        </form>
      )}
      {o.status === "accepted" && o.fulfillment !== "delivered" && (
        <form
          className="business-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const evidence = new FormData(e.currentTarget).get("evidence");
            const saved = await operation.run(() =>
              api(`orders/${o.id}/fulfillment`, "POST", {
                expectedVersion: o.version,
                status: next,
                evidence,
              }),
            );
            if (saved) onClose();
          }}
        >
          <FieldGroup>
            <p className="page-description">
              下一运输节点：
              <Status value={next} />
            </p>
            <Field name="evidence" label="客户可见进度说明" minLength={2} />
            <Button disabled={operation.busy}>确认更新运输进度</Button>
          </FieldGroup>
        </form>
      )}
      {o.fulfillment === "delivered" && (
        <p className="page-description">运输已完成。</p>
      )}
    </OperationPanel>
  );
}
function DocumentUpload({
  orderId,
  onClose,
  onSaved,
  returnFocus,
}: {
  orderId: string;
  onClose: () => void;
  onSaved: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const operation = useOperation();
  const formId = useId();
  return (
    <OperationPanel
      kind="dialog"
      open
      onClose={onClose}
      returnFocus={returnFocus}
      busy={operation.busy}
      title="上传订单单据"
      description="选择单据类型并上传 PDF、PNG 或 JPEG 文件，最大 3 MB。"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={operation.busy}
            onClick={onClose}
          >
            取消
          </Button>
          <Button form={formId} disabled={operation.busy}>
            {operation.busy ? "上传中…" : "上传单据"}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="business-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget,
            data = new FormData(form);
          data.set("orderId", orderId);
          const result = await operation.run(() =>
            api("attachments", "POST", data),
          );
          if (result) onSaved();
        }}
      >
        <FieldGroup>
          <UiField className="form-field">
            <FieldLabel htmlFor="document-kind">单据类型</FieldLabel>
            <NativeSelect name="kind" id="document-kind">
              <NativeSelectOption value="BOL">BOL 提货单</NativeSelectOption>
              <NativeSelectOption value="POD">POD 签收单</NativeSelectOption>
              <NativeSelectOption value="other">其他单据</NativeSelectOption>
            </NativeSelect>
          </UiField>
          <Field
            name="file"
            label="文件（PDF / PNG / JPEG，最大 3 MB）"
            type="file"
            accept="application/pdf,image/png,image/jpeg"
          />
          <ErrorNotice message={operation.error} />
        </FieldGroup>
      </form>
    </OperationPanel>
  );
}
