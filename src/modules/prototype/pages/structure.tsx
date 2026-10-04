"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  Search,
  MapPin,
  FileText,
  Users,
  ShieldCheck,
} from "lucide-react";
import { catalog, type PageSpec } from "../catalog";
import { usePrototype } from "../provider";
import { money } from "../model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PreviewDialog as Dialog } from "@/components/prototype/PreviewDialog";
import { FormField } from "@/components/prototype/FormField";
import {
  PageHeading,
  Badge,
  EmptyState,
  ScenarioGuard,
} from "@/components/prototype/shared";
export function IndexPage() {
  return (
    <>
      <PageHeading
        title="从页面到流程，逐项确认"
        description="20 个页面入口 · 核心流程可操作 · 其他模块展示页面与状态"
      />
      <div className="guide-flow">
        <div>
          <span>01</span>
          <h2>客户询价与下单</h2>
          <p>填写资料 → 比较报价 → 确认订单 → 查看进度</p>
          <Button asChild>
            <Link href="/prototype/portal/inquiry">
              开始体验
              <ArrowUpRight size={15} />
            </Link>
          </Button>
        </div>
        <div>
          <span>02</span>
          <h2>后台审核与处理</h2>
          <p>查找订单 → 核对资料 → 提交承运商 → 处理结果</p>
          <Button asChild variant="outline">
            <Link href="/prototype/admin/orders">
              进入工作台
              <ArrowUpRight size={15} />
            </Link>
          </Button>
        </div>
      </div>
      <div className="notice">
        顶部评审栏可切换角色、异常场景或重置数据。角色切换在订单详情页保留当前订单；示例数据只保存在本浏览器。
      </div>
      {(["common", "portal", "admin"] as const).map((role) => (
        <section className="panel catalog-section" key={role}>
          <div className="panel-header">
            <h2>
              {role === "common"
                ? "通用与评审"
                : role === "portal"
                  ? "客户中心"
                  : "管理后台"}
            </h2>
            <span className="small muted">
              {catalog.filter((p) => p.role === role).length} 个页面
            </span>
          </div>
          <div className="catalog-grid">
            {catalog
              .filter((p) => p.role === role)
              .map((p) => (
                <Link key={p.id} href={p.path}>
                  <span className="catalog-id">{p.id}</span>
                  <div>
                    <strong>{p.name}</strong>
                    <small>
                      {p.requirements.join(" / ") || "原型评审"} ·{" "}
                      {p.states.join("、")}
                    </small>
                  </div>
                  <Badge tone={p.fidelity === "高保真" ? "blue" : "neutral"}>
                    {p.fidelity}
                  </Badge>
                  <ArrowUpRight size={14} />
                </Link>
              ))}
          </div>
        </section>
      ))}
    </>
  );
}
function StructureDialog({
  name,
  fields,
  description = "字段与交互结构示例，关闭后不会保存或提交业务数据。",
  trigger = "查看详情",
}: {
  name: string;
  fields: string[];
  description?: string;
  trigger?: string;
}) {
  return (
    <Dialog
      title={name}
      description={description}
      trigger={
        <Button variant="outline" size="sm">
          {trigger}
        </Button>
      }
    >
      <div className="dialog-fields">
        {fields.map((field) => (
          <FormField key={field} label={field}>
            <Input placeholder={`填写${field}（示例）`} />
          </FormField>
        ))}
      </div>
      <div className="notice warning dialog-notice">
        此处展示待实现的操作结构；尚未接入提交服务。
      </div>
    </Dialog>
  );
}
function MoneyPages({ admin }: { admin: boolean }) {
  const [tab, setTab] = useState(admin ? "应收账单" : "账单");
  const records: Record<string, [string, string, number, string][]> = {
    账单: [
      ["BILL-1003", "10 月运输费用", 1248000, "待核验"],
      ["BILL-1002", "9 月已结账单", 832000, "已结清"],
    ],
    应收账单: [
      ["AR-1003", "星航跨境 / 10 月运费", 1248000, "待核验"],
      ["AR-1002", "远帆贸易 / 9 月运费", 832000, "已结清"],
    ],
    应付账单: [
      ["AP-1001", "Estes / 承运费用", 136000, "待核验"],
      ["AP-0998", "Old Dominion / 承运费用", 420000, "已结清"],
    ],
    费用调整: [
      ["ADJ-101", "预约服务追加", 3000, "待审批"],
      ["ADJ-098", "重复计费冲正", -4500, "已审核"],
    ],
    资金流水: [
      ["TX-1003", "汇款入账", 500000, "已到账"],
      ["TX-1002", "账单支出示例", -36000, "已记账"],
    ],
    充值申请: [
      ["DEP-1003", "凭证等待核验", 500000, "待核验"],
      ["DEP-1002", "汇款凭证已核实", 500000, "已到账"],
      ["DEP-1001", "汇款信息不完整", 300000, "失败"],
    ],
  };
  const financialTabs = admin
    ? ["应收账单", "应付账单", "费用调整"]
    : ["账单", "资金流水", "充值申请"];
  return (
    <>
      <div className="balance-strip">
        <div>
          <small>{admin ? "应收金额" : "可用余额"} · USD</small>
          <strong>$12,480.00</strong>
          <span>展示口径待确认</span>
        </div>
        <div>
          <small>{admin ? "应付金额" : "冻结金额"} · USD</small>
          <strong>$1,360.00</strong>
          <span>订单预占示例</span>
        </div>
        <div>
          <small>{admin ? "待核验金额" : "信用额度"} · USD</small>
          <strong>{admin ? "$5,000.00" : "未启用"}</strong>
          <span>{admin ? "申请不等于到账" : "预付 / 月结规则待定"}</span>
        </div>
      </div>
      <section className="panel structure-panel">
        <div className="filter-tabs">
          {financialTabs.map((t) => (
            <button
              aria-pressed={tab === t || (tab === "账单" && t === "应收账单")}
              key={t}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="structure-tools">
          <span className="small muted">2026 年 10 月 · USD · 只读示例</span>
          <StructureDialog
            name={admin ? "费用调整申请" : "充值申请"}
            trigger={admin ? "查看调整结构" : "查看充值结构"}
            fields={
              admin
                ? ["关联账单", "调整原因", "调整金额"]
                : ["申请金额", "汇款参考号", "凭证说明"]
            }
          />
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>记录编号</th>
                <th>业务摘要</th>
                <th>金额 · USD</th>
                <th>状态</th>
                <th>更新时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {records[tab].map(([id, desc, amount, status]) => (
                <tr key={id}>
                  <td>{id}</td>
                  <td>{desc}</td>
                  <td className="mono">{money(Number(amount))}</td>
                  <td>
                    <Badge
                      tone={
                        status === "已到账"
                          ? "success"
                          : status === "失败"
                            ? "error"
                            : "warning"
                      }
                    >
                      {status}
                    </Badge>
                  </td>
                  <td>10/04 09:30</td>
                  <td>
                    <Dialog
                      title={`${tab}详情 · ${id}`}
                      description="只读状态设计，示例金额不参与余额计算。"
                      trigger={
                        <Button variant="ghost" size="sm">
                          查看
                        </Button>
                      }
                    >
                      <dl className="facts">
                        <div>
                          <dt>业务摘要</dt>
                          <dd>{desc}</dd>
                        </div>
                        <div>
                          <dt>金额</dt>
                          <dd>{money(Number(amount))}</dd>
                        </div>
                        <div>
                          <dt>核验状态</dt>
                          <dd>{status}</dd>
                        </div>
                        <div>
                          <dt>待决事项</dt>
                          <dd>对账、入账及退款权限</dd>
                        </div>
                      </dl>
                    </Dialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="footnote">
        申请待核验、已到账与失败是不同状态。结构页不执行扣款、充值、结算或信用额度变更。
      </p>
    </>
  );
}
function Tickets({ admin }: { admin: boolean }) {
  const [filter, setFilter] = useState("全部");
  const rows = [
    {
      id: "CS-1048",
      title: "收货方申请变更预约时间",
      type: "预约协调",
      status: "待处理",
      owner: "待分配",
    },
    {
      id: "CS-1043",
      title: "运输途中外箱破损，申请协助核验",
      type: "货损核验",
      status: "处理中",
      owner: "Alex",
    },
    {
      id: "CS-1037",
      title: "补充签收文件",
      type: "单据申请",
      status: "已完结",
      owner: "Morgan",
    },
  ];
  return (
    <section className="panel structure-panel">
      <div className="filter-tabs">
        {["全部", "待处理", "处理中", "已完结"].map((t) => (
          <button
            key={t}
            aria-pressed={filter === t}
            onClick={() => setFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="structure-tools">
        <span className="small muted">完结工单不代表赔付成功</span>
        <StructureDialog
          name="新建服务工单"
          trigger="查看提单结构"
          fields={["关联订单号", "问题类型", "问题描述", "附件说明"]}
        />
      </div>
      <div className="ticket-list">
        {rows
          .filter((r) => filter === "全部" || r.status === filter)
          .map((r) => (
            <div key={r.id}>
              <div className="ticket-icon">
                <FileText size={19} />
              </div>
              <div className="ticket-body">
                <small>
                  {r.id} · {r.type}
                </small>
                <h3>{r.title}</h3>
                <p>关联 TF-261004-1078 · 10/04 09:30 · 负责人 {r.owner}</p>
              </div>
              <Badge
                tone={
                  r.status === "已完结"
                    ? "success"
                    : r.status === "待处理"
                      ? "warning"
                      : "blue"
                }
              >
                {r.status}
              </Badge>
              <Dialog
                title={r.title}
                description={`${r.id} · 示例工单，赔付审批独立于工单处理。`}
                trigger={
                  <Button variant="outline" size="sm">
                    详情
                  </Button>
                }
              >
                <div className="ticket-detail">
                  <h3>客户描述</h3>
                  <p>请协助核实该订单的派送安排，相关照片与资料待补充。</p>
                  <h3>处理记录</h3>
                  <p>10/04 09:30 客户创建工单</p>
                  <h3>赔付状态</h3>
                  <Badge>未发起赔付申请</Badge>
                  {admin && (
                    <>
                      <h3>内部备注（客户不可见）</h3>
                      <textarea
                        aria-label="内部工单备注"
                        placeholder="记录核验依据，仅展示输入结构"
                      />
                    </>
                  )}
                  <h3>对客回复</h3>
                  <textarea
                    aria-label="对客回复"
                    placeholder="回复结构示例，不会发送消息"
                  />
                  <p className="field-hint">
                    当前只展示交互结构，不执行发送或完结操作。
                  </p>
                </div>
              </Dialog>
            </div>
          ))}
      </div>
    </section>
  );
}
function Addresses({ warehouses = false }: { warehouses?: boolean }) {
  const { state, scenario } = usePrototype();
  const [q, setQ] = useState("");
  const list = [
    {
      ...state.draft.origin,
      scope: warehouses ? "公共仓库" : "公共仓库 · 只读",
    },
    { ...state.draft.destination, scope: "客户私有地址" },
  ];
  return (
    <>
      <div className="structure-tools standalone">
        <div className="search-field">
          <Search size={16} />
          <Input
            aria-label="搜索地址"
            placeholder="搜索名称或地址"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <StructureDialog
          name="新增地址"
          trigger="新增地址结构"
          fields={[
            "地址名称",
            "地址类型",
            "完整地址",
            "联系人",
            "联系电话",
            "共享范围",
          ]}
        />
      </div>
      <div className="address-grid">
        {list
          .filter((a) =>
            (a.name + a.address).toLowerCase().includes(q.toLowerCase()),
          )
          .map((a) => (
            <section key={a.scope} className="panel address-card">
              <div className="panel-header">
                <MapPin size={19} />
                <Badge>{a.scope}</Badge>
              </div>
              <h2>{a.name}</h2>
              <p>
                {scenario === "long"
                  ? a.address +
                    " · Receiving Dock B, Building 12, Appointment required before delivery."
                  : a.address}
              </p>
              <small>{a.contact}</small>
              <div className="address-bottom">
                <span>商业地址 · 美国</span>
                <StructureDialog
                  name={`地址资料 · ${a.name}`}
                  fields={["地址名称", "完整地址", "联系人", "联系电话"]}
                  trigger="编辑结构"
                />
              </div>
            </section>
          ))}
      </div>
      {!list.some((a) =>
        (a.name + a.address).toLowerCase().includes(q.toLowerCase()),
      ) && <EmptyState title="没有匹配的地址" />}
      <p className="footnote">
        公共仓库由运营维护，客户私有地址按所属客户隔离。编辑与共享权限等待 D02
        确认。
      </p>
    </>
  );
}
function Customers() {
  return (
    <section className="panel structure-panel">
      <div className="structure-tools">
        <h2>客户账户</h2>
        <StructureDialog
          name="邀请客户成员"
          trigger="邀请成员结构"
          fields={["所属客户", "成员姓名", "成员邮箱", "角色"]}
        />
      </div>
      <div className="ticket-list">
        {["星航跨境", "远帆贸易", "Northbay Imports"].map((name, i) => (
          <div key={name}>
            <span className="avatar">
              <Users size={17} />
            </span>
            <div className="ticket-body">
              <h3>{name}</h3>
              <p>
                客户 CUS-00{i + 1} · {i + 2} 名成员 · 独立地址和订单权限
              </p>
            </div>
            <Badge tone={i === 2 ? "warning" : "success"}>
              {i === 2 ? "冻结示例" : "使用中"}
            </Badge>
            <Dialog
              title={`${name} · 成员与权限`}
              description="权限矩阵结构示例，邀请与角色变更尚未接入。"
              trigger={
                <Button size="sm" variant="outline">
                  查看成员
                </Button>
              }
            >
              <div className="permission-list">
                {[
                  "客户管理员：管理本客户成员、查看订单与账单",
                  "操作员：询价下单、维护地址、查看订单",
                  "财务：查看账单与资金申请",
                ].map((p) => (
                  <p key={p}>
                    <ShieldCheck size={16} />
                    {p}
                  </p>
                ))}
              </div>
              <p className="field-hint">
                待确认 D02：邀请方式、角色拆分和数据可见范围。
              </p>
            </Dialog>
          </div>
        ))}
      </div>
    </section>
  );
}
function Carriers() {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>承运服务与接入状态</h2>
        <Badge>尚未连接外部 API</Badge>
      </div>
      <div className="carrier-list">
        {["Estes Express", "Old Dominion", "XPO Logistics"].map((name, i) => (
          <div key={name}>
            <div>
              <h3>{name}</h3>
              <p>LTL 零担 · 美国境内 · 服务范围待确认</p>
            </div>
            <Badge tone={i === 2 ? "warning" : "neutral"}>
              {i === 2 ? "等待资料" : "待接入"}
            </Badge>
            <StructureDialog
              name={`${name} 接入配置`}
              fields={[
                "接入方式（API / 人工）",
                "服务范围",
                "报价有效期",
                "状态回调说明",
              ]}
              trigger="配置结构"
            />
          </div>
        ))}
      </div>
      <p className="footnote">
        正式接入前须确认凭证保管、报价错误、幂等提交和状态回调。原型不收集 API
        密钥。
      </p>
    </section>
  );
}
function Reports() {
  const [period, setPeriod] = useState("2026-10");
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>运输与运营概览</h2>
        <label className="date-filter">
          统计月份
          <Input
            type="month"
            aria-label="统计月份"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </label>
      </div>
      <div className="notice">
        统计结构示例：以下固定数据不随月份变化；正式统计口径、时区、取消单与异常单计算规则待确认。
      </div>
      <div className="report-bars">
        {[
          ["已签收", 64],
          ["运输中", 24],
          ["待提货", 9],
          ["异常", 3],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <div>
              <i style={{ width: `${value}%` }} />
            </div>
            <strong>{value} 单</strong>
          </div>
        ))}
      </div>
      <div className="report-definitions">
        <h3>待落地的统计维度</h3>
        <p>
          客户、承运商、路线、下单日期、履约状态和异常原因。管理视图需区分报价金额、结算金额与实际毛利。
        </p>
      </div>
    </section>
  );
}
function Inquiries() {
  const { state } = usePrototype();
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>当前询价与草稿</h2>
        <Badge tone="blue">本机保留</Badge>
      </div>
      <div className="inquiry-record">
        <div>
          <h3>
            {state.draft.origin.name} → {state.draft.destination.name}
          </h3>
          <p>
            {state.draft.reference} · {state.draft.mode} ·{" "}
            {state.draft.goods.length} 种货物 · {state.draft.pallets} 托盘
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/prototype/portal/inquiry">继续编辑</Link>
        </Button>
        <Button asChild>
          <Link href="/prototype/portal/quotes">查看当前报价</Link>
        </Button>
      </div>
      <p className="footnote">
        原型仅保留一份当前草稿。历史询价版本、多人协作和长期留存规则待 D09
        确认。
      </p>
    </section>
  );
}
export function Structure({ spec }: { spec: PageSpec }) {
  const { scenario } = usePrototype();
  const key = spec.path.split("/").pop();
  return (
    <>
      <PageHeading
        title={spec.name}
        description="页面层级、字段与状态结构，供业务和开发共同确认。"
        action={<Badge>结构与状态</Badge>}
      />
      <ScenarioGuard>
        {scenario === "empty" ? (
          <div className="panel">
            <EmptyState
              title={`暂无${spec.name}记录`}
              description="这里展示该模块的空状态；切换默认场景可查看示例内容。"
            />
          </div>
        ) : key === "finance" || key === "settlement" ? (
          <MoneyPages admin={spec.role === "admin"} />
        ) : key === "tickets" ? (
          <Tickets admin={spec.role === "admin"} />
        ) : key === "addresses" || key === "warehouses" ? (
          <Addresses warehouses={key === "warehouses"} />
        ) : key === "customers" ? (
          <Customers />
        ) : key === "carriers" ? (
          <Carriers />
        ) : key === "reports" ? (
          <Reports />
        ) : (
          <Inquiries />
        )}
      </ScenarioGuard>
      <div className="scope-note">
        <FileText size={16} />
        <div>
          <strong>开发交接 · {spec.requirements.join(" / ")}</strong>
          <p>
            待确认：{spec.openRules.join("；")}
            。本页的结构操作不会创建真实业务记录。
          </p>
        </div>
      </div>
    </>
  );
}
