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
import { useId, useRef, useState, type RefObject } from "react";
import { OperationPanel } from "./OperationPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const q = useData<Inquiry>("inquiries/" + id);
  const [action, setAction] = useState<"quote" | "no-quote" | null>(null);
  const [tab, setTab] = useState("shipment");
  const [message, setMessage] = useState("");
  const returnFocus = useRef<HTMLElement | null>(null);
  if (!q.data) return <Loading error={q.error} retry={() => q.refetch()} />;
  const i = q.data;
  const base = staff ? "/admin" : "/portal";
  return (
    <>
      <Heading
        title={i.number}
        description={"提交于 " + time(i.createdAt)}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Status value={i.status} />
            {staff && i.status !== "ordered" && (
              <>
                <Button
                  variant="outline"
                  onClick={(event) => {
                    returnFocus.current = event.currentTarget;
                    setAction("no-quote");
                  }}
                >
                  标记暂无报价
                </Button>
                <Button
                  onClick={(event) => {
                    returnFocus.current = event.currentTarget;
                    setMessage("");
                    setAction("quote");
                  }}
                >
                  录入报价
                </Button>
              </>
            )}
            <Button variant="outline" asChild>
              <Link href={base + "/inquiries"}>返回询价列表</Link>
            </Button>
          </div>
        }
      />
      {message && (
        <Alert role="status">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {i.order && (
        <Alert>
          <AlertDescription>
            已生成订单{" "}
            <TextLink href={base + "/orders/" + i.order.id}>
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
      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <TabsList aria-label="询价详情">
          <TabsTrigger value="shipment">运输需求</TabsTrigger>
          <TabsTrigger value="quotes">承运报价</TabsTrigger>
        </TabsList>
        <TabsContent value="shipment">
          <Shipment data={i.data} />
        </TabsContent>
        <TabsContent value="quotes">
          <BusinessSection
            title="承运方案"
            description="价格为本次运输的客户报价。下单时会再次校验有效期和可用余额。"
          >
            <QuoteOptions inquiry={i} staff={staff} />
          </BusinessSection>
        </TabsContent>
      </Tabs>
      {action === "quote" && (
        <QuoteForm
          inquiryId={id}
          returnFocus={returnFocus}
          onClose={() => setAction(null)}
          onSaved={() => {
            setAction(null);
            setTab("quotes");
            setMessage("报价已保存为草稿，请核对后发布。");
          }}
        />
      )}
      {action === "no-quote" && (
        <NoQuoteDialog
          inquiryId={id}
          returnFocus={returnFocus}
          onClose={() => setAction(null)}
        />
      )}
    </>
  );
}
function QuoteForm({
  inquiryId,
  onClose,
  onSaved,
  returnFocus,
}: {
  inquiryId: string;
  onClose: () => void;
  onSaved: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const operation = useOperation(),
    [fees, setFees] = useState([{ label: "运费", amount: "" }]);
  const formId = useId();
  const validFees = fees.every(
    (fee) => moneyInput.safeParse(fee.amount).success,
  );
  const total = validFees
    ? fees.reduce((sum, fee) => sum.plus(fee.amount), new Decimal(0)).toFixed(2)
    : null;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
      onSaved();
    }
  }
  return (
    <OperationPanel
      open
      onClose={onClose}
      returnFocus={returnFocus}
      busy={operation.busy}
      title="录入人工报价"
      description="采购成本仅内部可见。费用明细和总价将在发布后展示给客户。"
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
          <Button
            form={formId}
            disabled={operation.busy || total === null || Number(total) <= 0}
          >
            {operation.busy && <Spinner data-icon="inline-start" />}
            {operation.busy ? "保存中…" : "保存报价草稿"}
          </Button>
        </>
      }
    >
      <ErrorNotice message={operation.error} />
      <form id={formId} onSubmit={submit} className="business-stack">
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
        </FieldGroup>
      </form>
    </OperationPanel>
  );
}

function NoQuoteDialog({
  inquiryId,
  onClose,
  returnFocus,
}: {
  inquiryId: string;
  onClose: () => void;
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
      title="标记暂无报价"
      description="填写客户可见的原因，说明本次需求暂时无法提供运输报价。"
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
            {operation.busy ? "提交中…" : "标记暂无报价"}
          </Button>
        </>
      }
    >
      <ErrorNotice message={operation.error} />
      <form
        id={formId}
        onSubmit={async (event) => {
          event.preventDefault();
          const reason = new FormData(event.currentTarget).get("reason");
          const result = await operation.run(() =>
            api("inquiries/" + inquiryId + "/no-quote", "POST", { reason }),
          );
          if (result) onClose();
        }}
      >
        <FieldGroup>
          <Field
            name="reason"
            label="客户可见原因"
            minLength={2}
            disabled={operation.busy}
          />
        </FieldGroup>
      </form>
    </OperationPanel>
  );
}
