"use client";
import { BusinessSection } from "./shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import type { ColumnDef, CellContext } from "@tanstack/react-table";
import { RecordTable } from "./RecordTable";
import { QuoteOptions } from "./QuoteOptions";
import {
  Field as UiField,
  FieldLabel,
  FieldSet,
  FieldLegend,
  FieldGroup,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import Decimal from "decimal.js";
import { moneyInput } from "@/modules/business/contracts";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useData,
  useOperation,
  api,
  Heading,
  Loading,
  TextLink,
  Status,
  time,
  ErrorNotice,
  usd,
  Field,
} from "./shared";
import type { Inquiry } from "./types";
import { Shipment } from "./Shipment";
export function InquiryList({ staff = false }: { staff?: boolean }) {
  const base = staff ? "/admin" : "/portal";
  const columns: ColumnDef<Inquiry>[] = [
    {
      accessorKey: "number",
      header: "询价号",
      enableSorting: true,
      enableHiding: false,
      cell: ({ row }) => (
        <Button asChild variant="link" size="sm">
          <Link href={`${base}/inquiries/${row.original.id}`}>
            {row.original.number}
          </Link>
        </Button>
      ),
    },
    ...(staff
      ? [
          {
            id: "customer",
            header: "客户 / 联系人",
            cell: ({ row }: CellContext<Inquiry, unknown>) => (
              <div>
                {row.original.customerName}
                <p className="text-sm text-muted-foreground">
                  {row.original.customerContact}
                </p>
              </div>
            ),
          },
        ]
      : []),
    {
      id: "route",
      header: "运输线路",
      cell: ({ row }) => (
        <span>
          {row.original.data.origin.city}, {row.original.data.origin.state} →{" "}
          {row.original.data.destination.city},{" "}
          {row.original.data.destination.state}
        </span>
      ),
    },
    {
      id: "pickupDate",
      header: "提货日期",
      enableSorting: true,
      accessorFn: (inquiry) => inquiry.data.pickupDate,
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => <Status value={row.original.status} />,
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
        title="询价与报价"
        description={
          staff
            ? "查看待报价询价，录入并发布承运方案。"
            : "查看询价进度，对比运营发布的报价。"
        }
        action={createAction}
      />
      <BusinessSection
        title="询价记录"
        description="按询价号、运输线路或客户参考号搜索；筛选条件会保留在页面地址中。"
      >
        <RecordTable
          endpoint="inquiries"
          columns={columns}
          states={[
            { id: "pending", text: "待处理" },
            { id: "quoted", text: "已报价" },
            { id: "ordered", text: "已下单" },
            { id: "no_quote", text: "暂无报价" },
          ]}
          searchPlaceholder={
            staff ? "询价号、线路、参考号或客户" : "询价号、线路或参考号"
          }
          emptyTitle="暂无询价记录"
          emptyDescription={
            staff
              ? "客户提交询价后，可在这里录入承运方案。"
              : "创建第一笔询价，运营核实后会为你发布报价。"
          }
          emptyAction={createAction}
        />
      </BusinessSection>
    </>
  );
}
export function InquiryDetail({
  id,
  staff = false,
}: {
  id: string;
  staff?: boolean;
}) {
  const q = useData<Inquiry>(`inquiries/${id}`);
  if (!q.data) return <Loading error={q.error} retry={() => q.refetch()} />;
  const i = q.data;
  return (
    <>
      <Heading
        title={i.number}
        description={`提交于 ${time(i.createdAt)}`}
        action={<Status value={i.status} />}
      />
      <div className="business-detail">
        <div className="flex flex-col gap-6">
          <Shipment data={i.data} />
          <BusinessSection
            title="承运方案"
            description="价格为本次运输的客户报价。参考时效以实际运输为准。"
          >
            <div className="flex flex-col gap-5">
              {i.order && (
                <Alert>
                  <AlertDescription>
                    已生成订单{" "}
                    <TextLink
                      href={`${staff ? "/admin" : "/portal"}/orders/${i.order.id}`}
                    >
                      {i.order.number}
                    </TextLink>
                  </AlertDescription>
                </Alert>
              )}
              {i.reason && (
                <Alert variant="warning">
                  <AlertDescription>{i.reason}</AlertDescription>
                </Alert>
              )}
              <QuoteOptions inquiry={i} staff={staff} />
            </div>
          </BusinessSection>
        </div>
        {staff && i.status !== "ordered" ? (
          <QuoteForm inquiryId={id} />
        ) : (
          <BusinessSection title={<>询价说明</>}>
            <p className="page-description">
              报价为本次运输的销售金额，订单提交时系统再次校验有效期和可用余额。
            </p>
            <TextLink href={`${staff ? "/admin" : "/portal"}/inquiries`}>
              返回询价列表
            </TextLink>
          </BusinessSection>
        )}
      </div>
    </>
  );
}
function QuoteForm({ inquiryId }: { inquiryId: string }) {
  const operation = useOperation(),
    [fees, setFees] = useState([{ label: "运费", amount: "" }]),
    [message, setMessage] = useState("");
  const validFees = fees.every(
    (fee) => moneyInput.safeParse(fee.amount).success,
  );
  const total = validFees
    ? fees.reduce((sum, fee) => sum.plus(fee.amount), new Decimal(0)).toFixed(2)
    : null;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    const form = e.currentTarget,
      d = Object.fromEntries(new FormData(form)),
      result = await operation.run(() =>
        api(`inquiries/${inquiryId}/quotes`, "POST", {
          carrier: d.carrier,
          cost: d.cost,
          fees,
          expiresAt: new Date(String(d.expiresAt)).toISOString(),
          transit: d.transit,
          evidence: d.evidence,
        }),
      );
    if (result) {
      setMessage("报价已保存为草稿，请核对后发布。");
      form.reset();
      setFees([{ label: "运费", amount: "" }]);
    }
  }
  return (
    <BusinessSection title={<>录入人工报价</>}>
      <p className="page-description">
        采购成本仅内部可见。费用明细和总价将在发布后展示给客户。
      </p>
      <ErrorNotice message={operation.error} />
      {message && (
        <Alert role="status">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={submit} className="business-stack">
        <FieldGroup>
          <Field name="carrier" label="承运商 / 代理" />
          <Field
            name="cost"
            label="采购成本 USD"
            inputMode="decimal"
            pattern="[0-9]+(\.[0-9]{1,2})?"
          />
          <FieldSet>
            <FieldLegend>客户报价费用 USD</FieldLegend>
            {fees.map((f, n) => (
              <FieldGroup
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-3"
                key={n}
              >
                <UiField>
                  <FieldLabel htmlFor={`fee-${n}-label`}>费用名称</FieldLabel>
                  <Input
                    id={`fee-${n}-label`}
                    aria-label={`第 ${n + 1} 项费用名称`}
                    value={f.label}
                    required
                    onChange={(e) =>
                      setFees(
                        fees.map((v, k) =>
                          k === n ? { ...v, label: e.target.value } : v,
                        ),
                      )
                    }
                  />
                </UiField>
                <UiField
                  data-invalid={
                    !!f.amount && !moneyInput.safeParse(f.amount).success
                  }
                >
                  <FieldLabel htmlFor={`fee-${n}-amount`}>金额 USD</FieldLabel>
                  <Input
                    id={`fee-${n}-amount`}
                    aria-invalid={
                      !!f.amount && !moneyInput.safeParse(f.amount).success
                    }
                    aria-describedby={
                      f.amount && !moneyInput.safeParse(f.amount).success
                        ? `fee-${n}-error`
                        : undefined
                    }
                    aria-label={`第 ${n + 1} 项费用金额`}
                    inputMode="decimal"
                    value={f.amount}
                    required
                    pattern="[0-9]+(\.[0-9]{1,2})?"
                    onChange={(e) =>
                      setFees(
                        fees.map((v, k) =>
                          k === n ? { ...v, amount: e.target.value } : v,
                        ),
                      )
                    }
                  />
                  {f.amount && !moneyInput.safeParse(f.amount).success && (
                    <FieldError id={`fee-${n}-error`}>
                      请输入有效金额，最多两位小数。
                    </FieldError>
                  )}
                </UiField>
                {fees.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`移除第 ${n + 1} 项费用`}
                    onClick={() => setFees(fees.filter((_, k) => k !== n))}
                  >
                    移除
                  </Button>
                )}
              </FieldGroup>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={fees.length >= 20}
              onClick={() => setFees([...fees, { label: "", amount: "" }])}
            >
              添加费用
            </Button>
          </FieldSet>
          <Separator />
          <div
            aria-live="polite"
            className="flex items-center justify-between gap-3"
          >
            <span className="text-sm text-muted-foreground">客户报价总额</span>
            <strong className="tabular-nums">
              {total !== null ? usd(total) : "待填写完整"}
            </strong>
          </div>
          <Field
            name="expiresAt"
            label="报价有效至（你的本地时区）"
            type="datetime-local"
          />
          <Field
            name="transit"
            label="参考时效"
            placeholder="例如 3–5 个工作日"
          />
          <UiField>
            <FieldLabel htmlFor="evidence">报价来源 / 核实依据 *</FieldLabel>
            <Textarea
              id="evidence"
              name="evidence"
              required
              minLength={2}
              maxLength={2000}
              rows={3}
            />
            <FieldDescription>
              填写承运商报价来源，方便后续核对。
            </FieldDescription>
          </UiField>
          <Button
            disabled={operation.busy || total === null || Number(total) <= 0}
          >
            {operation.busy && <Spinner data-icon="inline-start" />}
            {operation.busy ? "保存中…" : "保存报价草稿"}
          </Button>
        </FieldGroup>
      </form>
      <Separator className="business-rule" />
      <form
        className="business-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const reason = new FormData(e.currentTarget).get("reason");
          await operation.run(() =>
            api(`inquiries/${inquiryId}/no-quote`, "POST", { reason }),
          );
        }}
      >
        <FieldGroup>
          <h3>无法报价</h3>
          <Field name="reason" label="客户可见原因" minLength={2} />
          <Button variant="outline" disabled={operation.busy}>
            标记暂无报价
          </Button>
        </FieldGroup>
      </form>
    </BusinessSection>
  );
}
