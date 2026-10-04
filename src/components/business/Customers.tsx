"use client";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AccountDirectory } from "./AccountDirectory";
import { useId, useRef, useState, type RefObject } from "react";
import {
  BusinessSection,
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
import { OperationPanel } from "./OperationPanel";
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
import { Button } from "@/components/ui/button";
import type { Customer } from "./types";

export function CustomersPage() {
  const q = useData<Customer[]>("customers");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <>
      <Heading
        title="客户管理"
        description="管理客户公司的联系资料与业务状态。成员账号在各客户详情中查看。"
        action={
          <Button
            onClick={(event) => {
              returnFocus.current = event.currentTarget;
              setMessage("");
              setCreating(true);
            }}
          >
            新建客户公司
          </Button>
        }
      />
      {message && (
        <Alert role="status">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <BusinessSection title="客户公司">
        {!q.data ? (
          <Loading error={q.error} retry={() => q.refetch()} />
        ) : (
          <>
            <Table head={["公司", "联系人", "邮箱 / 电话", "业务状态", "操作"]}>
              {q.data.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    {c.name}
                    <div className="mt-2">
                      <Badge variant="secondary">
                        {c.source === "self_signup" ? "自主注册" : "管理员建立"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{c.contact}</TableCell>
                  <TableCell>
                    <span className="break-all">{c.email}</span>
                    <br />
                    {c.phone}
                  </TableCell>
                  <TableCell>
                    <Status value={c.status} />
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/customers/${c.id}`}>查看客户</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
            {!q.data.length && (
              <Empty text="暂无客户公司，可点击新建客户公司" />
            )}
          </>
        )}
      </BusinessSection>
      {creating && (
        <CustomerCreate
          returnFocus={returnFocus}
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            setMessage(
              "客户公司及资金账户已创建，进入客户详情可查看成员并发送邀请。",
            );
          }}
        />
      )}
    </>
  );
}

export function CustomerDetail({ id }: { id: string }) {
  const q = useData<Customer>(`customers/${id}`);
  const operation = useOperation();
  const [inviting, setInviting] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  if (!q.data) return <Loading error={q.error} retry={() => q.refetch()} />;
  const c = q.data;
  return (
    <>
      <Heading
        title={c.name}
        description="客户公司资料与该公司的成员账号。"
        action={
          <Button variant="outline" asChild>
            <Link href="/admin/customers">返回客户列表</Link>
          </Button>
        }
      />
      <Tabs defaultValue="profile">
        <TabsList aria-label="客户详情">
          <TabsTrigger value="profile">客户资料</TabsTrigger>
          <TabsTrigger value="members">成员账号</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <BusinessSection title="客户资料">
            <ErrorNotice message={operation.error} />
            <dl className="grid gap-5 sm:grid-cols-2">
              {[
                ["公司名称", c.name],
                ["主要联系人", c.contact],
                ["联系邮箱", c.email],
                ["联系电话", c.phone],
                [
                  "客户来源",
                  c.source === "self_signup" ? "自主注册" : "管理员建立",
                ],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col gap-1">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="break-all">{value}</dd>
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <dt className="text-sm text-muted-foreground">业务状态</dt>
                <dd>
                  <Status value={c.status} />
                </dd>
              </div>
            </dl>
            <Separator />
            <ConfirmAction
              label={c.status === "active" ? "冻结新业务" : "恢复新业务"}
              title={
                c.status === "active"
                  ? "冻结客户的新业务？"
                  : "恢复客户的新业务？"
              }
              description={`${c.name}：${c.status === "active" ? "冻结后不能提交新的询价与订单，已有记录仍保留。" : "恢复后可以继续提交询价与订单。"}`}
              confirmLabel={c.status === "active" ? "确认冻结" : "确认恢复"}
              busy={operation.busy}
              onConfirm={() =>
                operation.run(() =>
                  api(`customers/${id}`, "PATCH", {
                    status: c.status === "active" ? "frozen" : "active",
                  }),
                )
              }
            />
          </BusinessSection>
        </TabsContent>
        <TabsContent value="members">
          <BusinessSection title="成员账号">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                这些人员使用各自的邮箱登录，共同处理本公司的业务。
              </p>
              <Button
                onClick={(event) => {
                  returnFocus.current = event.currentTarget;
                  setInviting(true);
                }}
              >
                邀请成员
              </Button>
            </div>
            <AccountDirectory key={id} endpoint={`customers/${id}/members`} />
          </BusinessSection>
        </TabsContent>
      </Tabs>
      {inviting && (
        <Invitations
          customer={c}
          returnFocus={returnFocus}
          onClose={() => setInviting(false)}
        />
      )}
    </>
  );
}

type PanelProps = {
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
};
function CustomerCreate({
  onClose,
  onDone,
  returnFocus,
}: PanelProps & { onDone: () => void }) {
  const operation = useOperation();
  const formId = useId();
  return (
    <OperationPanel
      kind="dialog"
      open
      onClose={onClose}
      returnFocus={returnFocus}
      busy={operation.busy}
      title="新建客户公司"
      description="填写公司及主要联系人信息，创建客户公司和资金账户。"
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
            {operation.busy ? "创建中…" : "创建公司及资金账户"}
          </Button>
        </>
      }
    >
      <ErrorNotice message={operation.error} />
      <form
        id={formId}
        onSubmit={async (event) => {
          event.preventDefault();
          const data = Object.fromEntries(new FormData(event.currentTarget));
          const result = await operation.run(() =>
            api<Customer>("customers", "POST", data),
          );
          if (result) onDone();
        }}
      >
        <FieldGroup className="grid gap-5 sm:grid-cols-2">
          <Field name="name" label="公司名称" disabled={operation.busy} />
          <Field name="contact" label="主要联系人" disabled={operation.busy} />
          <Field
            name="email"
            label="联系邮箱"
            type="email"
            disabled={operation.busy}
          />
          <Field name="phone" label="联系电话" disabled={operation.busy} />
        </FieldGroup>
      </form>
    </OperationPanel>
  );
}

function Invitations({
  customer: c,
  onClose,
  returnFocus,
}: PanelProps & { customer: Customer }) {
  const q = useData<
    { id: string; email: string; name: string; status: string }[]
  >("customers/" + c.id + "/invitations");
  const operation = useOperation();
  const [message, setMessage] = useState("");
  const formId = useId();
  return (
    <OperationPanel
      open
      onClose={onClose}
      returnFocus={returnFocus}
      busy={operation.busy}
      title={c.name + " · 邀请成员"}
      description="邀请客户同事加入工作区；已邀请邮箱可重新发送密码设置邮件。"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={operation.busy}
            onClick={onClose}
          >
            关闭
          </Button>
          <Button
            form={formId}
            disabled={operation.busy || c.status !== "active"}
          >
            {operation.busy ? "发送中…" : "发送邀请邮件"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <ErrorNotice message={operation.error} />
        {message && (
          <Alert role="status">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        {c.status !== "active" && (
          <Alert>
            <AlertDescription>
              该客户已冻结，恢复新业务后才能发送账号邀请。
            </AlertDescription>
          </Alert>
        )}
        <form
          id={formId}
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const d = new FormData(form);
            const result = await operation.run(() =>
              api("customers/" + c.id + "/invitations", "POST", {
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
            <Field
              name="name"
              label="账号姓名"
              disabled={operation.busy || c.status !== "active"}
            />
            <Field
              name="email"
              label="登录邮箱"
              type="email"
              disabled={operation.busy || c.status !== "active"}
            />
            <FieldSet disabled={operation.busy || c.status !== "active"}>
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
          </FieldGroup>
        </form>
        <Separator />
        <section
          aria-labelledby="invitation-records"
          className="flex flex-col gap-4"
        >
          <h3 id="invitation-records">邀请记录</h3>
          {!q.data ? (
            <Loading error={q.error} retry={() => q.refetch()} />
          ) : !q.data.length ? (
            <Empty text="暂无邀请记录" />
          ) : (
            <Table head={["姓名", "邮箱", "状态"]}>
              {q.data.map((i) => (
                <TableRow key={i.id}>
                  <TableCell>{i.name}</TableCell>
                  <TableCell className="break-all">{i.email}</TableCell>
                  <TableCell>
                    <Status value={i.status} />
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          )}
        </section>
      </div>
    </OperationPanel>
  );
}
