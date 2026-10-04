"use client";
import { BusinessSection } from "./shared";
import { ConfirmAction } from "./ConfirmAction";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TableRow, TableCell } from "@/components/ui/table";
import {
  FieldSet,
  FieldLegend,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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
        description="管理自主注册客户，也可建立客户公司并邀请同事账号。"
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
        <BusinessSection title={<>客户资料</>}>
          {!q.data ? (
            <Loading error={q.error} retry={() => q.refetch()} />
          ) : (
            <>
              <Table head={["公司", "联系人", "邮箱 / 电话", "状态", "账号"]}>
                {q.data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {c.name}
                      <div className="mt-2">
                        <Badge variant="secondary">
                          {c.source === "self_signup"
                            ? "自主注册"
                            : "管理员建立"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{c.contact}</TableCell>
                    <TableCell>
                      {c.email}
                      <br />
                      {c.phone}
                    </TableCell>
                    <TableCell>
                      <Status value={c.status} />
                      <ConfirmAction
                        label={
                          c.status === "active" ? "冻结新业务" : "恢复新业务"
                        }
                        title={
                          c.status === "active"
                            ? "冻结客户的新业务？"
                            : "恢复客户的新业务？"
                        }
                        description={`${c.name}：${c.status === "active" ? "冻结后不能提交新的询价与订单，已有记录仍保留。" : "恢复后可以继续提交询价与订单。"}`}
                        confirmLabel={
                          c.status === "active" ? "确认冻结" : "确认恢复"
                        }
                        busy={statusOperation.busy}
                        onConfirm={() =>
                          statusOperation.run(() =>
                            api(`customers/${c.id}`, "PATCH", {
                              status:
                                c.status === "active" ? "frozen" : "active",
                            }),
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
              {!q.data.length && <Empty text="暂无客户公司" />}
            </>
          )}
        </BusinessSection>
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
          <BusinessSection title={<>客户管理</>}>
            <p className="page-description">
              客户公司之间数据隔离。每个账号分别授予业务或财务权限。
            </p>
          </BusinessSection>
        )}
      </div>
    </>
  );
}
function CustomerCreate({ onDone }: { onDone: (c: Customer) => void }) {
  const operation = useOperation();
  return (
    <BusinessSection title={<>新建客户公司</>}>
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
        <FieldGroup>
          <Field name="name" label="公司名称" />
          <Field name="contact" label="主要联系人" />
          <Field name="email" label="联系邮箱" type="email" />
          <Field name="phone" label="联系电话" />
          <Button disabled={operation.busy}>
            {operation.busy ? "创建中…" : "创建公司及资金账户"}
          </Button>
        </FieldGroup>
      </form>
    </BusinessSection>
  );
}
function Invitations({ customer: c }: { customer: Customer }) {
  const q = useData<
      { id: string; email: string; name: string; status: string }[]
    >(`customers/${c.id}/invitations`),
    operation = useOperation(),
    [message, setMessage] = useState("");
  return (
    <BusinessSection title={<>{c.name} · 邀请账号</>}>
      <p className="page-description">
        邀请邮件发送后，客户通过链接设置自己的密码。填写已邀请邮箱可重新发送密码设置邮件。
      </p>
      <ErrorNotice message={operation.error} />
      {message && (
        <Alert role="status">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
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
        <FieldGroup>
          <Field name="name" label="账号姓名" />
          <Field name="email" label="登录邮箱" type="email" />
          <FieldSet>
            <FieldLegend>账号权限（至少选择一项）</FieldLegend>
            <FieldLabel
              htmlFor="role-customer_operator"
              className="business-check"
            >
              <Checkbox
                id="role-customer_operator"

                name="roles"
                value="customer_operator"
                defaultChecked
              />
              业务：询价、下单、查看订单
            </FieldLabel>
            <FieldLabel
              htmlFor="role-customer_finance"
              className="business-check"
            >
              <Checkbox
                id="role-customer_finance"

                name="roles"
                value="customer_finance"
                defaultChecked
              />
              财务：充值、余额、流水
            </FieldLabel>
          </FieldSet>
          <Button disabled={operation.busy || c.status !== "active"}>
            {operation.busy ? "发送中…" : "发送邀请邮件"}
          </Button>
        </FieldGroup>
      </form>
      <Separator className="business-rule" />
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
    </BusinessSection>
  );
}
