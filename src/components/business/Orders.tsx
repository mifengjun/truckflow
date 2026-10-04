"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import type { Inquiry, Order } from "./types";
import { Shipment } from "./Shipment";
export function OrderList({ staff = false }: { staff?: boolean }) {
  const [page, setPage] = useState(0),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    q = useData<Order[]>(`orders?page=${page}`),
    base = staff ? "/admin" : "/portal";
  const rows = q.data?.filter(
    (o) =>
      (!status || o.status === status) &&
      (!search ||
        `${o.number} ${o.snapshot.carrier} ${o.externalId ?? ""}`
          .toLowerCase()
          .includes(search.toLowerCase())),
  );
  return (
    <>
      <Heading
        title={staff ? "订单工作台" : "订单管理"}
        description={
          staff
            ? "审核客户订单，记录承运商接单结果并更新运输进度。"
            : "跟踪订单进度，查看运输信息和运单文件。"
        }
        action={
          !staff && (
            <Button asChild>
              <TextLink href="/portal/inquiry">创建询价</TextLink>
            </Button>
          )
        }
      />
      <div className="panel">
        <div className="business-filters">
          <div className="form-field">
            <label htmlFor="order-search">搜索本页订单</label>
            <input
              className="input"
              id="order-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="订单号 / 承运商 / 承运商单号"
            />
          </div>
          <div className="form-field">
            <label htmlFor="order-status">筛选本页状态</label>
            <select
              className="input"
              id="order-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">全部状态</option>
              {[
                { id: "pending_review", text: "待审核" },
                { id: "submitting", text: "正在下单" },
                { id: "unknown", text: "结果待核实" },
                { id: "accepted", text: "已接单" },
                { id: "failed", text: "已拒单" },
              ].map((s) => (
                <option key={s.id} value={s.id}>
                  {s.text}
                </option>
              ))}
            </select>
          </div>
        </div>
        {!q.data ? (
          <Loading error={q.error} retry={() => q.refetch()} />
        ) : (
          <>
            <Table
              head={[
                "订单号",
                "运输线路",
                "承运商",
                "金额 USD",
                "订单状态",
                "运输进度",
                "操作",
              ]}
            >
              {rows?.map((o) => (
                <tr key={o.id}>
                  <td>{o.number}</td>
                  <td>
                    {o.snapshot.inquiry.origin.city} →{" "}
                    {o.snapshot.inquiry.destination.city}
                    <small className="muted" style={{ display: "block" }}>
                      {o.snapshot.inquiry.pickupDate}
                    </small>
                  </td>
                  <td>{o.snapshot.carrier}</td>
                  <td>{usd(o.amount)}</td>
                  <td>
                    <Status value={o.status} />
                  </td>
                  <td>
                    <Status value={o.fulfillment} />
                  </td>
                  <td>
                    <TextLink href={`${base}/orders/${o.id}`}>
                      查看详情
                    </TextLink>
                  </td>
                </tr>
              ))}
            </Table>
            {!rows?.length && (
              <Empty
                text={
                  q.data.length
                    ? "本页暂无符合筛选条件的订单"
                    : "暂无订单，先提交询价并选择报价"
                }
              />
            )}
            <Pager page={page} setPage={setPage} length={q.data.length} />
          </>
        )}
      </div>
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
        <div className="notice">
          已创建订单{" "}
          <TextLink href={`/portal/orders/${i.order.id}`}>
            {i.order.number}
          </TextLink>
        </div>
      )}
      <div className="business-detail">
        <Shipment data={i.data} />
        <section className="panel">
          <h2>{t.carrier}</h2>
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
          <hr className="business-rule" />
          {!funds.data ? (
            <Loading error={funds.error} retry={() => funds.refetch()} />
          ) : (
            <>
              <p>
                当前可用余额：<strong>{usd(funds.data.available)}</strong>
              </p>
              {!enough && (
                <div className="notice warning">
                  余额不足，请由具有财务权限的账号提交充值凭证，并等待财务核验。
                </div>
              )}
            </>
          )}
          {expired && (
            <div className="notice warning">报价已过期，请重新询价。</div>
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
        </section>
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
  const q = useData<Order>(`orders/${id}`);
  if (!q.data) return <Loading error={q.error} retry={() => q.refetch()} />;
  const o = q.data;
  return (
    <>
      <Heading
        title={o.number}
        description={`提交于 ${time(o.createdAt)}`}
        action={<Status value={o.status} />}
      />
      {o.status === "unknown" && (
        <div className="notice warning">
          承运商接单结果待核实，资金保持冻结。请等待运营核实结果。
        </div>
      )}
      <div className="business-detail">
        <div>
          <Shipment data={o.snapshot.inquiry} />
          <section className="panel">
            <div className="panel-header">
              <h2>费用与运单</h2>
              <strong>{usd(o.amount)}</strong>
            </div>
            <p>承运商：{o.snapshot.carrier}</p>
            <p>承运商单号：{o.externalId || "等待确认"}</p>
            <p>跟踪号：{o.tracking || "暂无"}</p>
            <p>
              运输进度：
              <Status value={o.fulfillment} />
            </p>
            {o.snapshot.fees.map((f, n) => (
              <div className="business-money-row" key={n}>
                <span>{f.label}</span>
                <span>{usd(f.amount)}</span>
              </div>
            ))}
            <hr className="business-rule" />
            <h3>订单单据</h3>
            {o.documents.length ? (
              <ul>
                {o.documents.map((d) => (
                  <li key={d.id}>
                    <a
                      className="business-link"
                      href={`/api/v1/attachments/${d.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {d.kind} · {d.filename}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty text="暂无单据，运营上传后可下载" />
            )}
            {staff && <DocumentUpload orderId={id} />}
          </section>
          <section className="panel">
            <h2>处理记录</h2>
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
          </section>
        </div>
        {staff ? (
          <OrderOperations order={o} />
        ) : (
          <section className="panel">
            <h2>订单状态</h2>
            <p className="page-description">
              {o.status === "accepted"
                ? "承运商已接单，运费已扣款。"
                : o.status === "failed"
                  ? "已确认拒单，冻结运费已释放。"
                  : "运费已冻结，运营正在处理订单。"}
            </p>
            <div className="business-actions">
              <TextLink href="/portal/orders">返回订单列表</TextLink>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
function OrderOperations({ order: o }: { order: Order }) {
  const operation = useOperation(),
    [result, setResult] = useState("unknown");
  const next =
    o.fulfillment === "awaiting_pickup"
      ? "picked_up"
      : o.fulfillment === "picked_up"
        ? "in_transit"
        : "delivered";
  return (
    <section className="panel">
      <h2>订单处理</h2>
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
              onClick={() =>
                operation.run(() =>
                  api(`orders/${o.id}/start`, "POST", {
                    expectedVersion: o.version,
                  }),
                )
              }
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
            await operation.run(() =>
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
          }}
        >
          <p className="page-description">
            核实承运商结果后记录。结果未知时不能再次发起下单。
          </p>
          <div className="form-field">
            <label htmlFor="result">承运商结果</label>
            <select
              className="input"
              id="result"
              value={result}
              onChange={(e) => setResult(e.target.value)}
            >
              <option value="unknown">结果待核实（保持冻结）</option>
              <option value="accepted">已接单（扣款）</option>
              <option value="failed">明确拒单（解冻）</option>
            </select>
          </div>
          {result === "accepted" && (
            <>
              <Field name="externalId" label="承运商单号" />
              <Field name="tracking" label="跟踪号" required={false} />
            </>
          )}
          {result === "failed" && (
            <label className="business-check">
              <input type="checkbox" name="confirmed" required />
              已核实承运商未生成订单
            </label>
          )}
          <Field name="evidence" label="核实依据（内部可见）" minLength={2} />
          <Button disabled={operation.busy}>
            {operation.busy ? "提交中…" : "记录处理结果"}
          </Button>
        </form>
      )}
      {o.status === "accepted" && o.fulfillment !== "delivered" && (
        <form
          className="business-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const evidence = new FormData(e.currentTarget).get("evidence");
            await operation.run(() =>
              api(`orders/${o.id}/fulfillment`, "POST", {
                expectedVersion: o.version,
                status: next,
                evidence,
              }),
            );
          }}
        >
          <p className="page-description">
            下一运输节点：
            <Status value={next} />
          </p>
          <Field name="evidence" label="客户可见进度说明" minLength={2} />
          <Button disabled={operation.busy}>确认更新运输进度</Button>
        </form>
      )}
      {o.fulfillment === "delivered" && (
        <p className="page-description">运输已完成。</p>
      )}
      <div className="business-actions">
        <TextLink href="/admin/orders">返回工作台</TextLink>
      </div>
    </section>
  );
}
function DocumentUpload({ orderId }: { orderId: string }) {
  const operation = useOperation();
  return (
    <form
      className="business-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget,
          data = new FormData(form);
        data.set("orderId", orderId);
        const result = await operation.run(() =>
          api("attachments", "POST", data),
        );
        if (result) form.reset();
      }}
    >
      <div className="form-field">
        <label htmlFor="document-kind">单据类型</label>
        <select className="input" name="kind" id="document-kind">
          <option value="BOL">BOL 提货单</option>
          <option value="POD">POD 签收单</option>
          <option value="other">其他单据</option>
        </select>
      </div>
      <Field
        name="file"
        label="文件（PDF / PNG / JPEG，最大 3 MB）"
        type="file"
        accept="application/pdf,image/png,image/jpeg"
      />
      <ErrorNotice message={operation.error} />
      <Button variant="outline" disabled={operation.busy}>
        {operation.busy ? "上传中…" : "上传单据"}
      </Button>
    </form>
  );
}
