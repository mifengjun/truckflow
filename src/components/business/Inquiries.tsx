"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useNow,
  useData,
  useOperation,
  api,
  Heading,
  Loading,
  Table,
  TextLink,
  Status,
  Empty,
  Pager,
  time,
  usd,
  ErrorNotice,
  Field,
} from "./shared";
import type { Inquiry } from "./types";
import { Shipment } from "./Shipment";
export function InquiryList({ staff = false }: { staff?: boolean }) {
  const [page, setPage] = useState(0),
    q = useData<Inquiry[]>(`inquiries?page=${page}`),
    base = staff ? "/admin" : "/portal";
  return (
    <>
      <Heading
        title="询价与报价"
        description={
          staff
            ? "查看待报价询价，录入并发布承运方案。"
            : "查看询价进度，对比运营发布的报价。"
        }
        action={
          !staff && (
            <Button asChild>
              <TextLink href="/portal/inquiry">创建询价</TextLink>
            </Button>
          )
        }
      />
      {!q.data ? (
        <Loading error={q.error} retry={() => q.refetch()} />
      ) : (
        <div className="panel">
          <Table
            head={[
              "询价号",
              "运输线路",
              "提货日期",
              "状态",
              "提交时间",
              "操作",
            ]}
          >
            {q.data.map((i) => (
              <tr key={i.id}>
                <td>{i.number}</td>
                <td>
                  {i.data.origin.city}, {i.data.origin.state} →{" "}
                  {i.data.destination.city}, {i.data.destination.state}
                </td>
                <td>{i.data.pickupDate}</td>
                <td>
                  <Status value={i.status} />
                </td>
                <td>{time(i.createdAt)}</td>
                <td>
                  <TextLink href={`${base}/inquiries/${i.id}`}>
                    查看询价
                  </TextLink>
                </td>
              </tr>
            ))}
          </Table>
          {!q.data.length && <Empty text="暂无询价记录" />}
          <Pager page={page} setPage={setPage} length={q.data.length} />
        </div>
      )}
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
  const now = useNow();
  const q = useData<Inquiry>(`inquiries/${id}`),
    operation = useOperation();
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
        <div>
          <Shipment data={i.data} />
          <section className="panel">
            <div className="panel-header">
              <h2>承运方案</h2>
              <span className="muted">参考时效，以实际运输为准</span>
            </div>
            {i.order && (
              <div className="notice">
                已生成订单{" "}
                <TextLink
                  href={`${staff ? "/admin" : "/portal"}/orders/${i.order.id}`}
                >
                  {i.order.number}
                </TextLink>
              </div>
            )}
            {i.reason && <div className="notice warning">{i.reason}</div>}
            {!i.quotes.length && (
              <Empty
                text={
                  i.status === "no_quote"
                    ? "当前暂无可用方案"
                    : "等待运营发布报价"
                }
              />
            )}
            <div className="business-stack">
              {i.quotes.map((t) => (
                <div className="business-quote" key={t.id}>
                  <div className="panel-header">
                    <div>
                      <h3>{t.carrier}</h3>
                      <p className="muted">{t.transit}</p>
                    </div>
                    <strong>{usd(t.amount)}</strong>
                  </div>
                  {t.fees.map((f, n) => (
                    <p key={n}>
                      {f.label}：{usd(f.amount)}
                    </p>
                  ))}
                  <p className="field-hint">有效至 {time(t.expiresAt)}</p>
                  <div className="business-actions">
                    <Status value={t.status} />
                    {staff && t.status === "draft" && (
                      <Button
                        disabled={
                          operation.busy ||
                          !!i.order ||
                          Date.parse(t.expiresAt) <= now
                        }
                        onClick={() =>
                          operation.run(() =>
                            api(`quotes/${t.id}/publish`, "POST"),
                          )
                        }
                      >
                        发布给客户
                      </Button>
                    )}
                    {!staff && !i.order && (
                      <Button asChild disabled={Date.parse(t.expiresAt) <= now}>
                        {Date.parse(t.expiresAt) <= now ? (
                          <span>已过期</span>
                        ) : (
                          <TextLink
                            href={`/portal/orders/new?inquiry=${i.id}&quote=${t.id}`}
                          >
                            选择方案
                          </TextLink>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <ErrorNotice message={operation.error} />
          </section>
        </div>
        {staff && i.status !== "ordered" ? (
          <QuoteForm inquiryId={id} />
        ) : (
          <section className="panel">
            <h2>询价说明</h2>
            <p className="page-description">
              报价为本次运输的销售金额，订单提交时系统再次校验有效期和可用余额。
            </p>
            <TextLink href={`${staff ? "/admin" : "/portal"}/inquiries`}>
              返回询价列表
            </TextLink>
          </section>
        )}
      </div>
    </>
  );
}
function QuoteForm({ inquiryId }: { inquiryId: string }) {
  const operation = useOperation(),
    [fees, setFees] = useState([{ label: "运费", amount: "" }]),
    [message, setMessage] = useState("");
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
      setMessage("报价已保存为草稿，请核对后发布。");
      form.reset();
      setFees([{ label: "运费", amount: "" }]);
    }
  }
  return (
    <section className="panel">
      <h2>录入人工报价</h2>
      <p className="page-description">
        费用逐项录入；成本独立存储，不返回客户接口。
      </p>
      <ErrorNotice message={operation.error} />
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      <form onSubmit={submit} className="business-stack">
        <Field name="carrier" label="承运商 / 代理" />
        <Field
          name="cost"
          label="采购成本 USD"
          inputMode="decimal"
          pattern="[0-9]+(\.[0-9]{1,2})?"
        />
        <fieldset>
          <legend>客户报价费用 USD</legend>
          {fees.map((f, n) => (
            <div className="business-fee-row" key={n}>
              <input
                className="input"
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
              <input
                className="input"
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
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={fees.length >= 20}
            onClick={() => setFees([...fees, { label: "", amount: "" }])}
          >
            添加费用
          </Button>
        </fieldset>
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
        <Field name="evidence" label="报价来源 / 核实依据" />
        <Button disabled={operation.busy}>
          {operation.busy ? "保存中…" : "保存报价草稿"}
        </Button>
      </form>
      <hr className="business-rule" />
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
        <h3>无法报价</h3>
        <Field name="reason" label="客户可见原因" minLength={2} />
        <Button variant="outline" disabled={operation.busy}>
          标记暂无报价
        </Button>
      </form>
    </section>
  );
}
