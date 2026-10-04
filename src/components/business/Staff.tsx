"use client";
import { useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  BusinessSection,
  Heading,
  Loading,
  Table,
  Empty,
  ErrorNotice,
  Field,
  useData,
  useOperation,
  api,
} from "./shared";
import { OperationPanel } from "./OperationPanel";
import { ConfirmAction } from "./ConfirmAction";
import {
  staffRoleLabels,
  staffRoles,
  staffCreateInput,
  staffUpdateInput,
  type StaffDetails,
} from "@/modules/business/staff-contracts";
type CustomerOption = { id: string; name: string };
type Staff = StaffDetails & {
  id: string;
  email: string;
  active: boolean;
  version: number;
  invitationStatus: string | null;
};
type InvitationResult = { status: string; message: string };
function Pagination({
  page,
  more,
  change,
}: {
  page: number;
  more: boolean;
  change: (page: number) => void;
}) {
  return page > 0 || more ? (
    <nav aria-label="列表分页" className="flex items-center justify-end gap-3">
      <Button
        type="button"
        variant="outline"
        disabled={!page}
        onClick={() => change(page - 1)}
      >
        上一页
      </Button>
      <span className="text-sm">第 {page + 1} 页</span>
      <Button
        type="button"
        variant="outline"
        disabled={!more}
        onClick={() => change(page + 1)}
      >
        下一页
      </Button>
    </nav>
  ) : null;
}
export function StaffPage() {
  const [page, setPage] = useState(0),
    [invitePage, setInvitePage] = useState(0);
  const q = useData<{ items: Staff[]; hasMore: boolean }>(`staff?page=${page}`);
  const pending = useData<{
    items: { id: string; email: string; details: StaffDetails }[];
    hasMore: boolean;
  }>(`staff/invitations?page=${invitePage}`);
  const [editing, setEditing] = useState<Staff | "new" | null>(null);
  const [message, setMessage] = useState("");
  const focus = useRef<HTMLElement | null>(null);
  const op = useOperation();
  async function resend(id: string) {
    setMessage("");
    const result = await op.run(() =>
      api<InvitationResult>(`staff/${id}/invite`, "POST"),
    );
    if (result) setMessage(result.message);
    return result;
  }
  async function toggle(p: Staff) {
    const result = await op.run(() =>
      api<{ destination: string | null }>(`staff/${p.id}`, "PATCH", {
        name: p.name,
        roles: p.roles,
        allCustomers: p.allCustomers,
        customerIds: p.customerIds,
        active: !p.active,
        expectedVersion: p.version,
      }),
    );
    if (result?.destination) window.location.assign(result.destination);
    else if (result)
      setMessage(p.active ? "员工账号已停用。" : "员工账号已启用。");
    return result;
  }
  return (
    <>
      <Heading
        title="员工管理"
        description="设置内部员工的角色、可访问客户和账号状态。仅全局管理员可操作。"
        action={
          <Button
            onClick={(e) => {
              focus.current = e.currentTarget;
              setMessage("");
              setEditing("new");
            }}
          >
            新增员工
          </Button>
        }
      />
      {message && (
        <Alert role="status">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <ErrorNotice message={op.error} />
      <BusinessSection
        title="内部员工"
        description="管理员拥有全部客户范围时，即为全局管理员。系统至少保留一名可用的全局管理员。"
      >
        {!q.data ? (
          <Loading error={q.error} retry={() => q.refetch()} />
        ) : (
          <div className="flex flex-col gap-4">
            {q.data.items.length ? (
              <Table
                head={[
                  "姓名 / 邮箱",
                  "角色权限",
                  "客户范围",
                  "账号状态",
                  "操作",
                ]}
              >
                {q.data.items.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.name}
                      <div className="break-all text-sm text-muted-foreground">
                        {p.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {p.roles.map((r) => (
                          <Badge variant="secondary" key={r}>
                            {staffRoleLabels[r]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.allCustomers
                        ? "全部客户"
                        : `指定 ${p.customerIds.length} 个客户`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.active ? "outline" : "secondary"}>
                        {p.active ? "正常" : "已停用"}
                      </Badge>
                      {p.invitationStatus && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {p.invitationStatus === "sent"
                            ? "设置密码邮件已发送"
                            : "邀请未完成，可重试"}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={op.busy}
                          onClick={(e) => {
                            focus.current = e.currentTarget;
                            setMessage("");
                            setEditing(p);
                          }}
                        >
                          编辑权限
                        </Button>
                        <ConfirmAction
                          label={p.active ? "停用" : "启用"}
                          title={`${p.active ? "停用" : "启用"} ${p.name}？`}
                          description={
                            p.active
                              ? "停用后，该员工将无法继续访问业务数据。可随时重新启用。"
                              : "启用后，该员工可按当前角色和客户范围访问系统。"
                          }
                          confirmLabel={p.active ? "确认停用" : "确认启用"}
                          busy={op.busy}
                          onConfirm={() => toggle(p)}
                        />
                        {p.active && p.invitationStatus && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={op.busy}
                            onClick={() => resend(p.id)}
                          >
                            重新发送邀请
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
            ) : (
              <Empty text="暂无员工账号" />
            )}
            <Pagination page={page} more={q.data.hasMore} change={setPage} />
          </div>
        )}
      </BusinessSection>
      {!pending.data ? (
        <Loading error={pending.error} retry={() => pending.refetch()} />
      ) : (
        (pending.data.items.length > 0 || invitePage > 0) && (
          <BusinessSection
            title="待完成的员工邀请"
            description="账号开通中断的记录会保留在此处，重试不会重复创建员工。"
          >
            <Table head={["姓名", "邮箱", "操作"]}>
              {pending.data.items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.details.name}</TableCell>
                  <TableCell className="break-all">{p.email}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      disabled={op.busy}
                      onClick={() => resend(p.id)}
                    >
                      重试开通
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
            <Pagination
              page={invitePage}
              more={pending.data.hasMore}
              change={setInvitePage}
            />
          </BusinessSection>
        )
      )}
      {editing && (
        <StaffEditor
          account={editing}
          close={() => setEditing(null)}
          focus={focus}
          completed={setMessage}
        />
      )}
    </>
  );
}
function StaffEditor({
  account,
  close,
  focus,
  completed,
}: {
  account: Staff | "new";
  close: () => void;
  focus: RefObject<HTMLElement | null>;
  completed: (s: string) => void;
}) {
  const q = useData<Staff & { assigned: CustomerOption[] }>(
    account === "new" ? "staff/customer-options?page=0" : `staff/${account.id}`,
  );
  if (account !== "new" && !q.data)
    return (
      <OperationPanel
        open
        onClose={close}
        title="编辑员工权限"
        description="正在读取当前权限和客户范围。"
        returnFocus={focus}
        footer={
          <Button variant="outline" onClick={close}>
            取消
          </Button>
        }
      >
        <Loading error={q.error} retry={() => q.refetch()} />
      </OperationPanel>
    );
  return (
    <StaffForm
      account={account}
      initial={account === "new" ? undefined : q.data}
      close={close}
      focus={focus}
      completed={completed}
    />
  );
}
function StaffForm({
  account,
  initial: loaded,
  close,
  focus,
  completed,
}: {
  account: Staff | "new";
  initial?: Staff & { assigned: CustomerOption[] };
  close: () => void;
  focus: RefObject<HTMLElement | null>;
  completed: (s: string) => void;
}) {
  const [initial] = useState(loaded);
  const [name, setName] = useState(initial?.name ?? ""),
    [email, setEmail] = useState("");
  const [roles, setRoles] = useState<StaffDetails["roles"]>(
    initial?.roles ?? ["operations"],
  );
  const [all, setAll] = useState(initial?.allCustomers ?? false);
  const [selected, setSelected] = useState<CustomerOption[]>(
    initial?.assigned ?? [],
  );
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(0),
    [error, setError] = useState("");
  const options = useData<{ items: CustomerOption[]; hasMore: boolean }>(
    `staff/customer-options?search=${encodeURIComponent(search)}&page=${page}`,
  );
  const op = useOperation();
  const isNew = account === "new";
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const d = {
      name,
      roles,
      allCustomers: all,
      customerIds: all ? [] : selected.map((c) => c.id),
    };
    const parsed = isNew
      ? staffCreateInput.safeParse({ ...d, email })
      : staffUpdateInput.safeParse({
          ...d,
          active: initial!.active,
          expectedVersion: initial!.version,
        });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "请检查表单");
      return;
    }
    const result = await op.run(() =>
      api<InvitationResult & { destination?: string | null }>(
        isNew ? "staff" : `staff/${account.id}`,
        isNew ? "POST" : "PATCH",
        parsed.data,
      ),
    );
    if (result) {
      if (result.destination) window.location.assign(result.destination);
      else {
        completed(
          isNew ? result.message : "员工权限已更新，下次请求即按新权限校验。",
        );
        close();
      }
    }
  }
  function choose(c: CustomerOption, checked: boolean) {
    setSelected((v) => (checked ? [...v, c] : v.filter((x) => x.id !== c.id)));
  }
  return (
    <OperationPanel
      open
      onClose={close}
      title={isNew ? "新增员工" : "编辑员工权限"}
      description={
        isNew
          ? "填写员工邮箱并分配权限。员工收到邮件后设置自己的登录密码。"
          : "角色与客户范围共同决定员工可访问的数据。修改后立即用于后续请求。"
      }
      busy={op.busy}
      returnFocus={focus}
      footer={
        <>
          <Button variant="outline" disabled={op.busy} onClick={close}>
            取消
          </Button>
          <Button type="submit" form="staff-form" disabled={op.busy}>
            {op.busy ? "处理中…" : isNew ? "创建并发送邀请" : "保存权限"}
          </Button>
        </>
      }
    >
      <form id="staff-form" onSubmit={save} className="flex flex-col gap-5">
        <ErrorNotice message={error || op.error} />
        <Field
          label="员工姓名"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          disabled={op.busy}
        />
        {isNew ? (
          <Field
            label="员工邮箱"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={op.busy}
          />
        ) : (
          <p className="break-all text-sm text-muted-foreground">
            登录邮箱：{account.email}
          </p>
        )}
        <fieldset disabled={op.busy} className="flex flex-col gap-3">
          <legend className="mb-3 font-medium">角色权限</legend>
          {staffRoles.map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-3">
              <Checkbox
                checked={roles.includes(r)}
                onCheckedChange={(v) =>
                  setRoles((old) =>
                    v === true ? [...old, r] : old.filter((x) => x !== r),
                  )
                }
              />
              {staffRoleLabels[r]}
            </label>
          ))}
          <p className="text-sm text-muted-foreground">
            运营处理询价与订单；财务处理充值与结算；管理员管理客户与成员；成本查看是附加权限。
          </p>
        </fieldset>
        <fieldset disabled={op.busy} className="flex flex-col gap-3">
          <legend className="mb-3 font-medium">客户范围</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="scope"
              checked={all}
              onChange={() => setAll(true)}
            />
            全部客户（包含今后新增客户）
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="scope"
              checked={!all}
              onChange={() => setAll(false)}
            />
            指定客户
          </label>
          {!all && (
            <>
              <p className="text-sm">已选择 {selected.length} 个客户</p>
              <div className="flex flex-wrap gap-2">
                {selected.map((c) => (
                  <Button
                    key={c.id}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => choose(c, false)}
                    aria-label={`移除 ${c.name}`}
                  >
                    {c.name} ×
                  </Button>
                ))}
              </div>
              <Input
                aria-label="搜索客户"
                placeholder="搜索客户公司"
                value={search}
                maxLength={100}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
              {!options.data ? (
                <Loading
                  error={options.error}
                  retry={() => options.refetch()}
                />
              ) : (
                <>
                  <div className="flex max-h-60 flex-col gap-3 overflow-y-auto rounded-md border p-3">
                    {options.data.items.length ? (
                      options.data.items.map((c) => (
                        <label key={c.id} className="flex items-start gap-3">
                          <Checkbox
                            checked={selected.some((x) => x.id === c.id)}
                            onCheckedChange={(v) => choose(c, v === true)}
                          />
                          <span>{c.name}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        没有匹配的客户
                      </p>
                    )}
                  </div>
                  <Pagination
                    page={page}
                    more={options.data.hasMore}
                    change={setPage}
                  />
                </>
              )}
            </>
          )}
        </fieldset>
      </form>
    </OperationPanel>
  );
}
