"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useData,
  useOperation,
  api,
  Heading,
  Loading,
  Table,
  Empty,
  ErrorNotice,
  Field,
  Status,
} from "./shared";
import type { Customer } from "./types";
export function CustomersPage() {
  const statusOperation = useOperation();
  const q = useData<Customer[]>("customers"),
    [selected, setSelected] = useState<Customer | null>(null),
    [creating, setCreating] = useState(false);
  return (
    <>
      <Heading
        title="客户与账号"
        description="先建立客户公司和资金账户，再邀请客户使用独立账号。"
        action={
          <Button
            onClick={() => {
              setCreating(true);
              setSelected(null);
            }}
          >
            新建客户公司
          </Button>
        }
      />
      <ErrorNotice message={statusOperation.error} />
      <div className="business-detail">
        <section className="panel">
          {!q.data ? (
            <Loading error={q.error} retry={() => q.refetch()} />
          ) : (
            <>
              <Table head={["公司", "联系人", "邮箱 / 电话", "状态", "账号"]}>
                {q.data.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.contact}</td>
                    <td>
                      {c.email}
                      <br />
                      {c.phone}
                    </td>
                    <td>
                      <Status value={c.status} />
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={statusOperation.busy}
                        onClick={() =>
                          statusOperation.run(() =>
                            api(`customers/${c.id}`, "PATCH", {
                              status:
                                c.status === "active" ? "frozen" : "active",
                            }),
                          )
                        }
                      >
                        {c.status === "active" ? "冻结新业务" : "恢复新业务"}
                      </Button>
                    </td>
                    <td>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelected(c);
                          setCreating(false);
                        }}
                      >
                        管理邀请
                      </Button>
                    </td>
                  </tr>
                ))}
              </Table>
              {!q.data.length && <Empty text="暂无客户公司" />}
            </>
          )}
        </section>
        {creating ? (
          <CustomerCreate
            onDone={(c) => {
              setCreating(false);
              setSelected(c);
            }}
          />
        ) : selected ? (
          <Invitations key={selected.id} customer={selected} />
        ) : (
          <section className="panel">
            <h2>客户管理</h2>
            <p className="page-description">
              客户公司之间数据隔离。每个账号分别授予业务或财务权限。
            </p>
          </section>
        )}
      </div>
    </>
  );
}
function CustomerCreate({ onDone }: { onDone: (c: Customer) => void }) {
  const operation = useOperation();
  return (
    <section className="panel">
      <h2>新建客户公司</h2>
      <ErrorNotice message={operation.error} />
      <form
        className="business-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const result = await operation.run(() =>
            api<Customer>(
              "customers",
              "POST",
              Object.fromEntries(new FormData(e.currentTarget)),
            ),
          );
          if (result) onDone(result);
        }}
      >
        <Field name="name" label="公司名称" />
        <Field name="contact" label="主要联系人" />
        <Field name="email" label="联系邮箱" type="email" />
        <Field name="phone" label="联系电话" />
        <Button disabled={operation.busy}>
          {operation.busy ? "创建中…" : "创建公司及资金账户"}
        </Button>
      </form>
    </section>
  );
}
function Invitations({ customer: c }: { customer: Customer }) {
  const q = useData<
      { id: string; email: string; name: string; status: string }[]
    >(`customers/${c.id}/invitations`),
    operation = useOperation(),
    [message, setMessage] = useState("");
  return (
    <section className="panel">
      <h2>{c.name} · 邀请账号</h2>
      <p className="page-description">
        邀请邮件发送后，客户通过链接设置自己的密码。填写已邀请邮箱可重新发送密码设置邮件。
      </p>
      <ErrorNotice message={operation.error} />
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      <form
        className="business-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget,
            d = new FormData(form);
          const result = await operation.run(() =>
            api(`customers/${c.id}/invitations`, "POST", {
              name: d.get("name"),
              email: d.get("email"),
              roles: d.getAll("roles"),
            }),
          );
          if (result) {
            setMessage("邀请邮件已发送。");
            form.reset();
          }
        }}
      >
        <Field name="name" label="账号姓名" />
        <Field name="email" label="登录邮箱" type="email" />
        <fieldset>
          <legend>账号权限（至少选择一项）</legend>
          <label className="business-check">
            <input
              type="checkbox"
              name="roles"
              value="customer_operator"
              defaultChecked
            />
            业务：询价、下单、查看订单
          </label>
          <label className="business-check">
            <input
              type="checkbox"
              name="roles"
              value="customer_finance"
              defaultChecked
            />
            财务：充值、余额、流水
          </label>
        </fieldset>
        <Button disabled={operation.busy || c.status !== "active"}>
          {operation.busy ? "发送中…" : "发送邀请邮件"}
        </Button>
      </form>
      <hr className="business-rule" />
      <h3>邀请记录</h3>
      {q.data ? (
        q.data.map((i) => (
          <p key={i.id}>
            {i.name} · {i.email} · <Status value={i.status} />
          </p>
        ))
      ) : (
        <Loading error={q.error} retry={() => q.refetch()} />
      )}
    </section>
  );
}
