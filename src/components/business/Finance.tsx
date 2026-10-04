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
  Status,
  Empty,
  Pager,
  time,
  usd,
  ErrorNotice,
  Field,
} from "./shared";
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
  const account = useData<Account>("account"),
    requests = useData<Recharge[]>("recharges"),
    [page, setPage] = useState(0),
    entries = useData<Ledger[]>(`ledger?page=${page}`),
    operation = useOperation(),
    [message, setMessage] = useState("");
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      d = new FormData(form);
    const result = await operation.run(async () => {
      const fileData = new FormData();
      fileData.set("file", d.get("file")!);
      fileData.set("kind", "recharge_proof");
      const proof = await api<{ id: string }>("attachments", "POST", fileData);
      return api("recharges", "POST", {
        amount: d.get("amount"),
        reference: d.get("reference"),
        proofId: proof.id,
      });
    });
    if (result) {
      form.reset();
      setMessage("充值申请已提交。财务核实实际到账后入账。");
    }
  }
  return (
    <>
      <Heading
        title="资金账户"
        description="USD 预付账户。充值以财务确认实际到账为准。"
      />
      {!account.data ? (
        <Loading error={account.error} retry={() => account.refetch()} />
      ) : (
        <div className="business-summary">
          {[
            { name: "账户余额", amount: account.data.balance },
            { name: "冻结资金", amount: account.data.heldAmount },
            { name: "可用余额", amount: account.data.available },
          ].map((c) => (
            <div className="panel" key={c.name}>
              <span className="muted">{c.name}</span>
              <strong>{usd(c.amount)}</strong>
            </div>
          ))}
        </div>
      )}
      <div className="business-detail">
        <div>
          <section className="panel">
            <h2>充值申请</h2>
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
                    <tr key={r.id}>
                      <td>{time(r.createdAt)}</td>
                      <td>{usd(r.amount)}</td>
                      <td>{r.receivedAmount ? usd(r.receivedAmount) : "—"}</td>
                      <td>
                        <Status value={r.status} />
                      </td>
                      <td>{r.reason || r.reference}</td>
                      <td>
                        <a
                          className="business-link"
                          href={`/api/v1/attachments/${r.proofId}/download`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          查看凭证
                        </a>
                      </td>
                    </tr>
                  ))}
                </Table>
                {!requests.data.length && <Empty text="暂无充值申请" />}
              </>
            )}
          </section>
          <section className="panel">
            <h2>资金流水</h2>
            {!entries.data ? (
              <Loading error={entries.error} retry={() => entries.refetch()} />
            ) : (
              <>
                <Table head={["时间", "类型", "金额", "余额变动", "冻结变动"]}>
                  {entries.data.map((l) => (
                    <tr key={l.id}>
                      <td>{time(l.createdAt)}</td>
                      <td>
                        <Status value={l.type} />
                      </td>
                      <td>{usd(l.amount)}</td>
                      <td>{usd(l.balanceDelta)}</td>
                      <td>{usd(l.heldDelta)}</td>
                    </tr>
                  ))}
                </Table>
                {!entries.data.length && <Empty text="暂无资金流水" />}
                <Pager
                  page={page}
                  setPage={setPage}
                  length={entries.data.length}
                />
              </>
            )}
          </section>
        </div>
        <section className="panel">
          <h2>提交线下转账凭证</h2>
          <p className="page-description">
            请使用运营提供的收款账户。填写金额仅用于申报，以财务核验结果为准。
          </p>
          <ErrorNotice message={operation.error} />
          {message && (
            <div className="notice" role="status">
              {message}
            </div>
          )}
          <form className="business-stack" onSubmit={submit}>
            <Field
              name="amount"
              label="申报金额 USD"
              inputMode="decimal"
              pattern="[0-9]+(\.[0-9]{1,2})?"
            />
            <Field name="reference" label="转账参考号 / 说明" />
            <Field
              name="file"
              label="转账凭证（PDF / PNG / JPEG，最大 3 MB）"
              type="file"
              accept="application/pdf,image/png,image/jpeg"
            />
            <Button disabled={operation.busy}>
              {operation.busy ? "提交中…" : "提交财务核验"}
            </Button>
          </form>
        </section>
      </div>
    </>
  );
}
export function Settlement() {
  const [page, setPage] = useState(0),
    q = useData<Recharge[]>(`recharges?page=${page}`),
    [selected, setSelected] = useState<Recharge | null>(null);
  return (
    <>
      <Heading
        title="充值核验"
        description="核对银行实际到账金额及银行交易参考号。重复核验不会再次入账。"
      />
      <div className="business-detail">
        <section className="panel">
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
                  <tr key={r.id}>
                    <td>{time(r.createdAt)}</td>
                    <td>{usd(r.amount)}</td>
                    <td>{r.receivedAmount ? usd(r.receivedAmount) : "—"}</td>
                    <td>
                      <Status value={r.status} />
                    </td>
                    <td>{r.reference}</td>
                    <td>
                      {r.status === "pending" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelected(r)}
                        >
                          核验
                        </Button>
                      ) : (
                        r.reason
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
              {!q.data.length && <Empty text="暂无充值申请" />}
              <Pager page={page} setPage={setPage} length={q.data.length} />
            </>
          )}
        </section>
        {selected ? (
          <Verification
            key={selected.id}
            request={selected}
            onDone={() => setSelected(null)}
          />
        ) : (
          <section className="panel">
            <h2>核验操作</h2>
            <p className="page-description">
              选择一笔待核验申请。查看凭证并核对银行到账后再确认入账。
            </p>
          </section>
        )}
      </div>
    </>
  );
}
function Verification({
  request: r,
  onDone,
}: {
  request: Recharge;
  onDone: () => void;
}) {
  const operation = useOperation(),
    [reject, setReject] = useState(false),
    account = useData<Account>(`account?customerId=${r.customerId}`);
  return (
    <section className="panel">
      <h2>财务核验</h2>
      <p className="page-description">
        申报金额 {usd(r.amount)} · {r.reference}
      </p>
      {account.data && <p>当前账户余额 {usd(account.data.balance)}</p>}
      <div className="business-actions">
        <a
          className="business-link"
          href={`/api/v1/attachments/${r.proofId}/download`}
          target="_blank"
          rel="noreferrer"
        >
          打开转账凭证
        </a>
      </div>
      <ErrorNotice message={operation.error} />
      <form
        className="business-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget),
            result = await operation.run(() =>
              api(`recharges/${r.id}/${reject ? "reject" : "verify"}`, "POST", {
                expectedVersion: r.version,
                reason: d.get("reason"),
                ...(!reject
                  ? {
                      amount: d.get("amount"),
                      bankReference: d.get("bankReference"),
                    }
                  : {}),
              }),
            );
          if (result) onDone();
        }}
      >
        <div className="form-field">
          <label htmlFor="verify-action">处理方式</label>
          <select
            className="input"
            id="verify-action"
            value={reject ? "reject" : "verify"}
            onChange={(e) => setReject(e.target.value === "reject")}
          >
            <option value="verify">确认实际到账并入账</option>
            <option value="reject">驳回申请</option>
          </select>
        </div>
        {!reject && (
          <>
            <Field
              name="amount"
              label="银行实际到账 USD"
              inputMode="decimal"
              pattern="[0-9]+(\.[0-9]{1,2})?"
            />
            <Field name="bankReference" label="银行交易参考号（须唯一）" />
          </>
        )}
        <Field
          name="reason"
          label={reject ? "客户可见驳回原因" : "核验说明（客户可见）"}
          minLength={2}
        />
        <Button
          disabled={operation.busy}
          variant={reject ? "destructive" : "default"}
        >
          {operation.busy ? "处理中…" : reject ? "确认驳回" : "确认入账"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          关闭
        </Button>
      </form>
    </section>
  );
}
