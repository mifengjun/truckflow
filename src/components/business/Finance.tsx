"use client";
import { useId, useRef, useState, type RefObject } from "react";
import {
  BusinessSection,
  useData,
  useOperation,
  api,
  Heading,
  Loading,
  Table,
  Status,
  Empty,
  Pager,
  time,
  usd,
  ErrorNotice,
  Field,
} from "./shared";
import { OperationPanel } from "./OperationPanel";
import { ProofPreview } from "./ProofPreview";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TableRow, TableCell } from "@/components/ui/table";
import {
  Field as UiField,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import type { Recharge } from "./types";
type Account = { balance: string; heldAmount: string; available: string };
type Ledger = {
  id: string;
  type: string;
  amount: string;
  balanceDelta: string;
  heldDelta: string;
  orderId: string | null;
  createdAt: string;
};

export function FinancePage() {
  const account = useData<Account>("account");
  const requests = useData<Recharge[]>("recharges");
  const [page, setPage] = useState(0);
  const entries = useData<Ledger[]>("ledger?page=" + page);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState("requests");
  const [message, setMessage] = useState("");
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <>
      <Heading
        title="资金账户"
        description="USD 预付账户。充值以财务确认实际到账为准。"
        action={
          <Button
            onClick={(event) => {
              returnFocus.current = event.currentTarget;
              setMessage("");
              setCreating(true);
            }}
          >
            申请充值
          </Button>
        }
      />
      {message && (
        <Alert role="status">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {!account.data ? (
        <Loading error={account.error} retry={() => account.refetch()} />
      ) : (
        <div className="business-summary">
          {[
            { name: "账户余额", amount: account.data.balance },
            { name: "冻结资金", amount: account.data.heldAmount },
            { name: "可用余额", amount: account.data.available },
          ].map((c) => (
            <BusinessSection title={c.name} key={c.name}>
              <strong>{usd(c.amount)}</strong>
            </BusinessSection>
          ))}
        </div>
      )}
      <Tabs value={tab} onValueChange={setTab} className="gap-6">
        <TabsList aria-label="资金记录">
          <TabsTrigger value="requests">充值申请</TabsTrigger>
          <TabsTrigger value="ledger">资金流水</TabsTrigger>
        </TabsList>
        <TabsContent value="requests">
          <BusinessSection title="充值申请">
            {!requests.data ? (
              <Loading
                error={requests.error}
                retry={() => requests.refetch()}
              />
            ) : (
              <>
                <Table
                  head={[
                    "申请时间",
                    "申报金额",
                    "实际入账",
                    "状态",
                    "说明",
                    "凭证",
                  ]}
                >
                  {requests.data.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{time(r.createdAt)}</TableCell>
                      <TableCell>{usd(r.amount)}</TableCell>
                      <TableCell>
                        {r.receivedAmount ? usd(r.receivedAmount) : "—"}
                      </TableCell>
                      <TableCell>
                        <Status value={r.status} />
                      </TableCell>
                      <TableCell>{r.reason || r.reference}</TableCell>
                      <TableCell>
                        <a
                          className="business-link"
                          href={
                            "/api/v1/attachments/" + r.proofId + "/download"
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          查看凭证
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </Table>
                {!requests.data.length && (
                  <Empty text="暂无充值申请，可点击申请充值提交转账凭证" />
                )}
              </>
            )}
          </BusinessSection>
        </TabsContent>
        <TabsContent value="ledger">
          <BusinessSection title="资金流水">
            {!entries.data ? (
              <Loading error={entries.error} retry={() => entries.refetch()} />
            ) : (
              <>
                <Table head={["时间", "类型", "金额", "余额变动", "冻结变动"]}>
                  {entries.data.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{time(l.createdAt)}</TableCell>
                      <TableCell>
                        <Status value={l.type} />
                      </TableCell>
                      <TableCell>{usd(l.amount)}</TableCell>
                      <TableCell>{usd(l.balanceDelta)}</TableCell>
                      <TableCell>{usd(l.heldDelta)}</TableCell>
                    </TableRow>
                  ))}
                </Table>
                {!entries.data.length && <Empty text="暂无资金流水" />}
                {(entries.data.length > 0 || page > 0) && (
                  <Pager
                    page={page}
                    setPage={setPage}
                    length={entries.data.length}
                  />
                )}
              </>
            )}
          </BusinessSection>
        </TabsContent>
      </Tabs>
      {creating && (
        <RechargeCreate
          returnFocus={returnFocus}
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            setTab("requests");
            setMessage("充值申请已提交。财务核实实际到账后入账。");
          }}
        />
      )}
    </>
  );
}
function RechargeCreate({
  onClose,
  onDone,
  returnFocus,
}: {
  onClose: () => void;
  onDone: () => void;
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
      title="申请充值"
      description="请使用运营提供的收款账户。填写金额用于申报，以财务核验结果为准。"
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
            {operation.busy ? "提交中…" : "提交财务核验"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <ErrorNotice message={operation.error} />
        <form
          id={formId}
          onSubmit={async (event) => {
            event.preventDefault();
            const d = new FormData(event.currentTarget);
            const result = await operation.run(async () => {
              const fileData = new FormData();
              fileData.set("file", d.get("file")!);
              fileData.set("kind", "recharge_proof");
              const proof = await api<{ id: string }>(
                "attachments",
                "POST",
                fileData,
              );
              return api("recharges", "POST", {
                amount: d.get("amount"),
                reference: d.get("reference"),
                proofId: proof.id,
              });
            });
            if (result) onDone();
          }}
        >
          <FieldGroup>
            <Field
              name="amount"
              label="申报金额 USD"
              inputMode="decimal"
              pattern="[0-9]+([.][0-9]{1,2})?"
              disabled={operation.busy}
            />
            <Field
              name="reference"
              label="转账参考号 / 说明"
              disabled={operation.busy}
            />
            <Field
              name="file"
              label="转账凭证（PDF / PNG / JPEG，最大 3 MB）"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              disabled={operation.busy}
            />
          </FieldGroup>
        </form>
      </div>
    </OperationPanel>
  );
}

export function Settlement() {
  const [page, setPage] = useState(0);
  const q = useData<Recharge[]>("recharges?page=" + page);
  const [selected, setSelected] = useState<Recharge | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <>
      <Heading
        title="充值核验"
        description="打开申请查看转账凭证，核对实际到账金额及银行参考号后确认入账。"
      />
      <BusinessSection title="充值申请">
        {!q.data ? (
          <Loading error={q.error} retry={() => q.refetch()} />
        ) : (
          <>
            <Table
              head={[
                "申请时间",
                "申报金额",
                "实际入账",
                "状态",
                "转账说明",
                "操作",
              ]}
            >
              {q.data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{time(r.createdAt)}</TableCell>
                  <TableCell>{usd(r.amount)}</TableCell>
                  <TableCell>
                    {r.receivedAmount ? usd(r.receivedAmount) : "—"}
                  </TableCell>
                  <TableCell>
                    <Status value={r.status} />
                  </TableCell>
                  <TableCell>{r.reference}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(event) => {
                        returnFocus.current = event.currentTarget;
                        setSelected(r);
                      }}
                    >
                      {r.status === "pending" ? "核验" : "查看记录"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
            {!q.data.length && <Empty text="暂无充值申请" />}
            {(q.data.length > 0 || page > 0) && (
              <Pager page={page} setPage={setPage} length={q.data.length} />
            )}
          </>
        )}
      </BusinessSection>
      {selected && (
        <Verification
          key={selected.id}
          request={selected}
          returnFocus={returnFocus}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
function Verification({
  request: r,
  onClose,
  returnFocus,
}: {
  request: Recharge;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const operation = useOperation();
  const [reject, setReject] = useState(false);
  const account = useData<Account>("account?customerId=" + r.customerId);
  const formId = useId();
  const pending = r.status === "pending";
  return (
    <OperationPanel
      open
      wide
      onClose={onClose}
      returnFocus={returnFocus}
      busy={operation.busy}
      title={pending ? "财务核验" : "充值记录"}
      description={
        "申请于 " +
        time(r.createdAt) +
        "。核对银行实际到账后再确认，重复核验不会再次入账。"
      }
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
          {pending && (
            <Button
              form={formId}
              disabled={operation.busy}
              variant={reject ? "destructive" : "default"}
            >
              {operation.busy ? "处理中…" : reject ? "确认驳回" : "确认入账"}
            </Button>
          )}
        </>
      }
    >
      <div className="grid items-start gap-6 md:grid-cols-2">
        <BusinessSection title="转账凭证">
          <ProofPreview proofId={r.proofId} />
        </BusinessSection>
        <div className="flex flex-col gap-6">
          <BusinessSection title="申请信息">
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">申报金额</dt>
                <dd>{usd(r.amount)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">状态</dt>
                <dd>
                  <Status value={r.status} />
                </dd>
              </div>
              {r.receivedAmount && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">实际入账</dt>
                  <dd>{usd(r.receivedAmount)}</dd>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground">转账说明</dt>
                <dd className="break-words">{r.reference}</dd>
              </div>
              {r.reason && (
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">处理说明</dt>
                  <dd className="break-words">{r.reason}</dd>
                </div>
              )}
            </dl>
          </BusinessSection>
          {pending && (
            <BusinessSection title="核验操作">
              <div className="flex flex-col gap-5">
                {!account.data ? (
                  <Loading
                    error={account.error}
                    retry={() => account.refetch()}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    当前账户余额 {usd(account.data.balance)}
                  </p>
                )}
                <ErrorNotice message={operation.error} />
                <form
                  id={formId}
                  onSubmit={async (event) => {
                    event.preventDefault();
                    const d = new FormData(event.currentTarget);
                    const result = await operation.run(() =>
                      api(
                        "recharges/" +
                          r.id +
                          "/" +
                          (reject ? "reject" : "verify"),
                        "POST",
                        {
                          expectedVersion: r.version,
                          reason: d.get("reason"),
                          ...(!reject
                            ? {
                                amount: d.get("amount"),
                                bankReference: d.get("bankReference"),
                              }
                            : {}),
                        },
                      ),
                    );
                    if (result) onClose();
                  }}
                >
                  <FieldGroup>
                    <UiField className="form-field">
                      <FieldLabel htmlFor="verify-action">处理方式</FieldLabel>
                      <NativeSelect
                        id="verify-action"
                        value={reject ? "reject" : "verify"}
                        disabled={operation.busy}
                        onChange={(event) =>
                          setReject(event.target.value === "reject")
                        }
                      >
                        <NativeSelectOption value="verify">
                          确认实际到账并入账
                        </NativeSelectOption>
                        <NativeSelectOption value="reject">
                          驳回申请
                        </NativeSelectOption>
                      </NativeSelect>
                    </UiField>
                    {!reject && (
                      <>
                        <Field
                          name="amount"
                          label="银行实际到账 USD"
                          inputMode="decimal"
                          pattern="[0-9]+([.][0-9]{1,2})?"
                          disabled={operation.busy}
                        />
                        <Field
                          name="bankReference"
                          label="银行交易参考号（须唯一）"
                          disabled={operation.busy}
                        />
                      </>
                    )}
                    <Field
                      name="reason"
                      label={
                        reject ? "客户可见驳回原因" : "核验说明（客户可见）"
                      }
                      minLength={2}
                      disabled={operation.busy}
                    />
                  </FieldGroup>
                </form>
              </div>
            </BusinessSection>
          )}
        </div>
      </div>
    </OperationPanel>
  );
}
