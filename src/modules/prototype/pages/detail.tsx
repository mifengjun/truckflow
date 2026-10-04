"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useRef } from "react";
import {
  ArrowLeft,
  Check,
  Copy,
  FileCheck2,
  MessagesSquare,
  Truck,
} from "lucide-react";
import { usePrototype } from "../provider";
import {
  updateOrderResult,
  type OrderResult,
  money,
  localDate,
  services,
} from "../model";
import { Button } from "@/components/ui/button";
import {
  PageHeading,
  AddressSummary,
  OrderStatus,
  ScenarioGuard,
  EmptyState,
} from "@/components/prototype/shared";
import { AttachmentList } from "@/components/prototype/AttachmentList";
export function Detail({ id, admin = false }: { id: string; admin?: boolean }) {
  const { state, setState, scenario } = usePrototype();
  const params = useSearchParams();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState("");
  const lock = useRef(false);
  const order = state.orders.find((o) => o.id === id);
  const base = `/prototype/${admin ? "admin" : "portal"}`;
  const candidate = params.get("return");
  const back = candidate?.startsWith(`${base}/orders?`)
    ? candidate
    : `${base}/orders`;
  async function process(confirm = false) {
    if (lock.current || !order) return;
    lock.current = true;
    setBusy(true);
    const result: OrderResult = confirm
      ? "accepted"
      : scenario === "carrier-timeout"
        ? "uncertain"
        : scenario === "carrier-failed"
          ? "failed"
          : "accepted";
    await new Promise((r) => setTimeout(r, 700));
    setState((s) => {
      const next = updateOrderResult(s, id, result);
      if (!note.trim()) return next;
      return {
        ...next,
        orders: next.orders.map((o) =>
          o.id === id
            ? {
                ...o,
                events: [
                  ...o.events,
                  {
                    at: new Date().toISOString(),
                    actor: "运营 · 内部备注",
                    text: note.trim(),
                  },
                ],
              }
            : o,
        ),
      };
    });
    setBusy(false);
    lock.current = false;
    setNote("");
  }
  if (!order)
    return (
      <EmptyState
        title="未找到这笔示例订单"
        description="订单可能已被重置，请返回订单列表。"
        action={
          <Button asChild>
            <Link href={back}>返回订单列表</Link>
          </Button>
        }
      />
    );
  const progress =
    order.fulfillment === "delivered"
      ? 4
      : order.fulfillment === "transit"
        ? 3
        : order.result === "accepted"
          ? 2
          : 0;
  return (
    <>
      <Link href={back} className="back-link">
        <ArrowLeft size={15} />
        返回{admin ? "订单工作台" : "订单列表"}
      </Link>
      <PageHeading
        title={order.id}
        description={`${order.draft.customer} · 创建于 ${localDate(order.createdAt)}（洛杉矶时间）`}
        action={
          <Button variant="outline" asChild>
            <Link href={`${base}/tickets`}>
              <MessagesSquare size={16} />
              联系服务团队
            </Link>
          </Button>
        }
      />
      <ScenarioGuard>
        <div
          className={`notice ${order.result === "failed" ? "error" : order.result === "uncertain" ? "warning" : order.result === "accepted" ? "success" : ""}`}
          role="status"
        >
          {order.result === "pending"
            ? "订单已创建，等待运营审核与承运商确认。"
            : order.result === "uncertain"
              ? "承运商请求超时，结果待确认。请先核实结果，避免重复下单。"
              : order.result === "failed"
                ? "承运商暂未受理。请联系运营核对资料后重试。"
                : "承运商已接单，可查看运输进度与单据。"}
          <span className="notice-status">
            下单结果 <OrderStatus order={order} /> 履约状态{" "}
            <OrderStatus order={order} kind="fulfillment" />
          </span>
        </div>
        <div className="detail-layout">
          <div>
            <section className="panel">
              <div className="panel-header">
                <h2>
                  <Truck size={17} />
                  运输进度
                </h2>
                <span className="small muted">事件状态 · 示例</span>
              </div>
              <ol className="shipment-progress">
                {["已创建", "已接单", "待提货", "运输中", "已签收"].map(
                  (label, i) => (
                    <li className={i <= progress ? "done" : ""} key={label}>
                      <span>{i <= progress ? <Check size={12} /> : i + 1}</span>
                      {label}
                    </li>
                  ),
                )}
              </ol>
              <div className="tracking-row">
                <span>追踪号</span>
                <strong>{order.tracking || "承运商确认后分配"}</strong>
                {order.tracking && (
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="复制追踪号"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(order.tracking);
                        setCopied("已复制");
                      } catch {
                        setCopied("复制失败，请手动选择追踪号");
                      }
                    }}
                  >
                    <Copy size={13} />
                    {copied || "复制"}
                  </Button>
                )}
              </div>
            </section>
            <section className="panel">
              <div className="panel-header">
                <h2>收发货资料</h2>
                <span className="small muted">
                  {order.draft.mode} · 提货 {order.draft.date}
                </span>
              </div>
              <AddressSummary draft={order.draft} />
            </section>
            <section className="panel">
              <div className="panel-header">
                <h2>货物与附加服务</h2>
                <span className="small muted">{order.draft.reference}</span>
              </div>
              <div className="review-goods">
                {order.draft.goods.map((g) => (
                  <div key={g.id}>
                    <strong>{g.name}</strong>
                    <span>{g.sku || "无 SKU"}</span>
                    <span>
                      {g.quantity} 件 / {g.weight} lb
                    </span>
                  </div>
                ))}
              </div>
              <dl className="facts">
                <div>
                  <dt>包装规格</dt>
                  <dd>
                    {order.draft.pallets} 托盘 · {order.draft.length} ×{" "}
                    {order.draft.width} × {order.draft.height} in
                  </dd>
                </div>
                <div>
                  <dt>附加服务</dt>
                  <dd>
                    {services
                      .filter((s) => order.draft.services.includes(s.id))
                      .map((s) => s.name)
                      .join("、") || "无"}
                  </dd>
                </div>
                <div>
                  <dt>客户备注</dt>
                  <dd>{order.draft.notes || "无"}</dd>
                </div>
              </dl>
            </section>
            <section className="panel">
              <div className="panel-header">
                <h2>费用与单据</h2>
                <span className="small muted">{order.quote.carrier}</span>
              </div>
              <dl className="fee-details">
                {order.quote.fees.map((f) => (
                  <div key={f.name}>
                    <dt>{f.name}</dt>
                    <dd>{money(f.amountMinor)}</dd>
                  </div>
                ))}
                <div className="fee-total">
                  <dt>报价总额 · USD</dt>
                  <dd>{money(order.quote.amountMinor)}</dd>
                </div>
              </dl>
              <p className="small muted fee-note">
                付款与结算状态待接入；本页不表示已付款。
              </p>
              <AttachmentList order={order} />
            </section>
          </div>
          <aside>
            <section className="panel action-panel">
              <div className="panel-header">
                <h2>{admin ? "当前处理事项" : "订单摘要"}</h2>
                <FileCheck2 size={18} />
              </div>
              {admin ? (
                <>
                  {order.result === "accepted" ? (
                    <div className="accepted-note">
                      <Check size={26} />
                      <strong>承运商已确认</strong>
                      <p>当前无需重复提交。后续进度由物流事件更新。</p>
                    </div>
                  ) : (
                    <>
                      <p className="muted small">
                        {order.result === "uncertain"
                          ? "先核实承运商系统中的订单结果，再确认接单。"
                          : "请核对地址、货物和服务范围后提交承运商。"}
                      </p>
                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setChecked(e.target.checked)}
                        />
                        已核对运输资料与承运结果
                      </label>
                      <label className="action-note">
                        内部处理备注
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="填写核验依据，仅后台可见"
                        />
                      </label>
                      <Button
                        disabled={!checked || busy}
                        onClick={() => process(order.result === "uncertain")}
                      >
                        {busy
                          ? "正在处理…"
                          : order.result === "uncertain"
                            ? "已核实：确认接单"
                            : order.result === "failed"
                              ? "重新提交承运商"
                              : "审核并提交承运商"}
                      </Button>
                      <p className="small muted">
                        此操作更新当前示例订单，保留处理记录。
                      </p>
                    </>
                  )}
                  <details className="assumption">
                    <summary>待确认的业务规则</summary>
                    <p>
                      D04 /
                      D10：审核是否必需、人工核实权限及承运商重试机制待定。结果由顶部评审场景控制。
                    </p>
                  </details>
                </>
              ) : (
                <>
                  <dl className="facts">
                    <div>
                      <dt>承运商</dt>
                      <dd>{order.quote.carrier}</dd>
                    </div>
                    <div>
                      <dt>参考时效</dt>
                      <dd>{order.quote.days}</dd>
                    </div>
                    <div>
                      <dt>提货日期</dt>
                      <dd>{order.draft.date}</dd>
                    </div>
                    <div>
                      <dt>报价币种</dt>
                      <dd>USD</dd>
                    </div>
                  </dl>
                  <div className="summary-total">
                    <span>报价总额</span>
                    <strong>{money(order.quote.amountMinor)}</strong>
                  </div>
                </>
              )}
            </section>
            <section className="panel">
              <div className="panel-header">
                <h2>{admin ? "处理记录" : "订单动态"}</h2>
              </div>
              <ol className="timeline">
                {order.events
                  .filter((e) => admin || !e.actor.includes("内部备注"))
                  .slice()
                  .reverse()
                  .map((event, i) => (
                    <li key={i}>
                      <strong>{event.text}</strong>
                      <small>
                        {localDate(event.at)} · {event.actor}
                      </small>
                    </li>
                  ))}
              </ol>
              <p className="small muted">物流时间 · America/Los_Angeles</p>
            </section>
          </aside>
        </div>
      </ScenarioGuard>
    </>
  );
}
