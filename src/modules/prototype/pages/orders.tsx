"use client";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  Plus,
  Search,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { usePrototype } from "../provider";
import { type PrototypeOrder, money, localDate } from "../model";
import { filterOrders } from "../order-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/prototype/DataTable";
import {
  PageHeading,
  OrderStatus,
  EmptyState,
  ScenarioGuard,
} from "@/components/prototype/shared";
const tabs = [
  ["all", "全部订单"],
  ["pending", "待审核"],
  ["uncertain", "结果待确认"],
  ["pickup", "待提货"],
  ["transit", "运输中"],
  ["delivered", "已签收"],
  ["failed", "异常"],
] as const;
export function Orders({ admin = false }: { admin?: boolean }) {
  const { state, scenario } = usePrototype();
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const status = params.get("status") || "all";
  const filtered = filterOrders(
    scenario === "empty" ? [] : state.orders,
    new URLSearchParams(params),
  );
  const page = Math.max(
    1,
    Math.min(
      Number(params.get("page")) || 1,
      Math.ceil(filtered.length / 6) || 1,
    ),
  );
  const rows = filtered.slice((page - 1) * 6, page * 6);
  const returnPath = path + (params.toString() ? `?${params}` : "");
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    router.replace(`${path}?${next}`, { scroll: false });
  }
  const href = (o: PrototypeOrder) =>
    `${path}/${o.id}?return=${encodeURIComponent(returnPath)}`;
  const columns: ColumnDef<PrototypeOrder>[] = [
    {
      id: "order",
      header: admin ? "订单 / 客户" : "订单号 / 参考号",
      cell: ({ row: { original: o } }) => (
        <div className="order-id">
          <Link href={href(o)}>{o.id}</Link>
          <small>
            {admin ? o.draft.customer : o.draft.reference || "无参考号"}
          </small>
        </div>
      ),
    },
    {
      id: "route",
      header: "运输路线",
      cell: ({ row: { original: o } }) => (
        <div className="table-route">
          <span>
            <i />
            {o.draft.origin.name}
          </span>
          <span>
            <i />
            {o.draft.destination.name}
          </span>
          <small>
            {scenario === "long"
              ? "Building 12 · Receiving Dock B · 长地址示例"
              : `${o.draft.pallets} 托盘 · ${o.draft.mode}`}
          </small>
        </div>
      ),
    },
    {
      id: "carrier",
      header: "承运商",
      cell: ({ row: { original: o } }) => (
        <div>
          {o.quote.carrier}
          <small className="cell-sub">{o.tracking || "等待分配追踪号"}</small>
        </div>
      ),
    },
    {
      id: "status",
      header: admin ? "处理状态" : "履约 / 下单状态",
      cell: ({ row: { original: o } }) => (
        <div className="status-stack">
          <OrderStatus order={o} kind={admin ? "result" : "fulfillment"} />
          <small>
            {admin ? (
              o.result === "pending" ? (
                "请核对运输资料"
              ) : o.result === "uncertain" ? (
                "需核实承运商结果"
              ) : o.result === "failed" ? (
                "资料修正后重试"
              ) : (
                "承运商已确认"
              )
            ) : (
              <OrderStatus order={o} />
            )}
          </small>
        </div>
      ),
    },
    {
      id: "amount",
      header: "费用 · USD",
      cell: ({ row: { original: o } }) => (
        <strong className="table-money">{money(o.quote.amountMinor)}</strong>
      ),
    },
    {
      id: "created",
      header: "创建时间",
      cell: ({ row: { original: o } }) => (
        <span className="mono muted">{localDate(o.createdAt)}</span>
      ),
    },
    {
      id: "action",
      header: "操作",
      cell: ({ row: { original: o } }) => (
        <Link
          className="table-action"
          aria-label={`${admin ? "处理" : "查看"}订单 ${o.id}`}
          href={href(o)}
        >
          {admin ? "处理" : "详情"}
          <ArrowUpRight size={13} />
        </Link>
      ),
    },
  ];
  return (
    <>
      <PageHeading
        eyebrow={admin ? "OPERATIONS / 运营中心" : "SHIPMENTS / 运输管理"}
        title={admin ? "订单工作台" : "我的订单"}
        description={
          admin
            ? "集中处理待审核、待确认与异常订单，让每一程进度清晰。"
            : "从下单到签收，随时掌握每一笔运输。"
        }
        action={
          !admin && (
            <Button asChild>
              <Link href="/prototype/portal/inquiry">
                <Plus size={17} />
                新建询价
              </Link>
            </Button>
          )
        }
      />
      {admin && (
        <div className="work-reminder">
          <span className="status-dot" />
          <strong>
            {
              state.orders.filter(
                (o) =>
                  o.result === "pending" ||
                  o.result === "uncertain" ||
                  o.result === "failed",
              ).length
            }{" "}
            笔订单需要处理
          </strong>
          <span>优先核实结果待确认的订单，避免重复提交承运商。</span>
        </div>
      )}
      <section className="panel orders-panel">
        <div className="filter-tabs" aria-label="订单状态筛选">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              aria-pressed={status === key}
              onClick={() => filter("status", key)}
            >
              {label}
              <span>
                {key === "all"
                  ? state.orders.length
                  : state.orders.filter(
                      (o) => o.result === key || o.fulfillment === key,
                    ).length}
              </span>
            </button>
          ))}
        </div>
        <div className="table-toolbar">
          <div className="search-field">
            <Search size={16} />
            <Input
              aria-label="搜索订单"
              placeholder="搜索订单号、参考号或追踪号"
              value={params.get("q") || ""}
              onChange={(e) => filter("q", e.target.value)}
            />
          </div>
          <label className="date-filter">
            <span>创建日期</span>
            <Input
              aria-label="创建日期"
              type="date"
              value={params.get("date") || ""}
              onChange={(e) => filter("date", e.target.value)}
            />
          </label>
          <Button variant="ghost" onClick={() => router.replace(path)}>
            <SlidersHorizontal size={15} />
            清除筛选
          </Button>
        </div>
        <ScenarioGuard>
          {rows.length ? (
            <>
              <div className="desktop-orders">
                <DataTable
                  rows={rows}
                  columns={columns}
                  label={admin ? "后台订单列表" : "客户订单列表"}
                />
              </div>
              <div className="mobile-orders">
                {rows.map((o) => (
                  <Link key={o.id} href={href(o)} className="mobile-order">
                    <div>
                      <strong>{o.id}</strong>
                      <OrderStatus
                        order={o}
                        kind={admin ? "result" : "fulfillment"}
                      />
                    </div>
                    <p>
                      {o.draft.origin.name} <span>→</span>{" "}
                      {o.draft.destination.name}
                    </p>
                    <div>
                      <small>
                        {o.quote.carrier} · {o.draft.pallets} 托盘
                      </small>
                      <strong>{money(o.quote.amountMinor)}</strong>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              title={
                params.get("q") || status !== "all"
                  ? "没有符合条件的订单"
                  : "还没有运输订单"
              }
              action={
                <Button variant="outline" onClick={() => router.replace(path)}>
                  清除筛选
                </Button>
              }
            />
          )}
        </ScenarioGuard>
        <div className="table-pagination">
          <span>共 {filtered.length} 条订单 · 每页 6 条</span>
          <div>
            <Button
              variant="outline"
              size="sm"
              aria-label="上一页"
              disabled={page === 1}
              onClick={() => filter("page", String(page - 1))}
            >
              <ChevronLeft size={15} />
            </Button>
            <span>
              {page} / {Math.max(1, Math.ceil(filtered.length / 6))}
            </span>
            <Button
              variant="outline"
              size="sm"
              aria-label="下一页"
              disabled={page * 6 >= filtered.length}
              onClick={() => filter("page", String(page + 1))}
            >
              <ChevronRight size={15} />
            </Button>
          </div>
        </div>
      </section>
      <div className="list-caption">
        <span>金额为示例报价，最终结算规则待确认。</span>
        <span>物流时间：America/Los_Angeles</span>
      </div>
    </>
  );
}
