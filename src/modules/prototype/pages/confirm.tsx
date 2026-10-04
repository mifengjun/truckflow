"use client";
import Link from "next/link";
import { useNow } from "../use-now";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import { usePrototype } from "../provider";
import { money, services, submitOrder } from "../model";
import { Button } from "@/components/ui/button";
import {
  PageHeading,
  AddressSummary,
  Summary,
} from "@/components/prototype/shared";
export function Confirm() {
  const now = useNow();
  const { state, setState } = usePrototype();
  const params = useSearchParams();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const intent = useRef<string | null>(null);
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const quote = state.quotes.find((q) => q.id === params.get("quote"));
  const valid =
    quote &&
    quote.draftRevision === state.draft.revision &&
    quote.expiresAt > now;
  async function submit() {
    if (lock.current || !quote || !checked) return;
    lock.current = true;
    setBusy(true);
    setError("");
    intent.current ??= crypto.randomUUID();
    try {
      await new Promise((r) => setTimeout(r, 600));
      if (!mounted.current) return;
      // This timestamp is captured by the submit event, never during render.
      // eslint-disable-next-line react-hooks/purity
      const timestamp = Date.now();
      const next = setState((current) =>
        submitOrder(current, quote.id, intent.current!, timestamp),
      );
      router.push(
        `/prototype/portal/orders/${next.orders.find((o) => o.intentId === intent.current)!.id}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "提交失败，请重试");
      setBusy(false);
      lock.current = false;
    }
  }
  if (!valid)
    return (
      <>
        <PageHeading
          title="报价已失效"
          description="资料已修改或报价已过期，请重新获取报价。"
        />
        <Button asChild>
          <Link href="/prototype/portal/quotes?request=1">重新获取报价</Link>
        </Button>
      </>
    );
  return (
    <>
      <Link href="/prototype/portal/quotes" className="back-link">
        <ArrowLeft size={15} />
        返回报价比较
      </Link>
      <PageHeading
        eyebrow="REVIEW & SUBMIT / 确认下单"
        title="最后一步，核对运输信息"
        description="订单将使用以下资料与报价快照，提交后交由运营审核。"
      />
      <div className="split-layout">
        <div>
          <section className="panel">
            <div className="panel-header">
              <h2>收发货信息</h2>
              <Link className="text-link" href="/prototype/portal/inquiry">
                修改
              </Link>
            </div>
            <AddressSummary draft={state.draft} />
          </section>
          <section className="panel">
            <div className="panel-header">
              <h2>货物与服务</h2>
              <Link
                className="text-link"
                href="/prototype/portal/inquiry?step=cargo"
              >
                修改
              </Link>
            </div>
            <div className="review-goods">
              {state.draft.goods.map((g) => (
                <div key={g.id}>
                  <strong>{g.name}</strong>
                  <span>{g.sku || "无 SKU"}</span>
                  <span>
                    {g.quantity} 件 · {g.weight} lb
                  </span>
                </div>
              ))}
            </div>
            <dl className="facts">
              <div>
                <dt>托盘尺寸</dt>
                <dd>
                  {state.draft.length} × {state.draft.width} ×{" "}
                  {state.draft.height} in
                </dd>
              </div>
              <div>
                <dt>附加服务</dt>
                <dd>
                  {services
                    .filter((s) => state.draft.services.includes(s.id))
                    .map((s) => s.name)
                    .join("、") || "无"}
                </dd>
              </div>
              <div>
                <dt>备注</dt>
                <dd>{state.draft.notes || "无"}</dd>
              </div>
            </dl>
          </section>
          <section className="panel">
            <div className="panel-header">
              <h2>已选报价</h2>
              <span className="small muted">{quote.carrier}</span>
            </div>
            <dl className="fee-details">
              {quote.fees.map((f) => (
                <div key={f.name}>
                  <dt>{f.name}</dt>
                  <dd>{money(f.amountMinor)}</dd>
                </div>
              ))}
              <div className="fee-total">
                <dt>总额 · USD</dt>
                <dd>{money(quote.amountMinor)}</dd>
              </div>
            </dl>
          </section>
          <div className="notice">
            <ShieldCheck size={17} />{" "}
            本轮仅创建示例订单，不产生真实扣款或承运委托。
          </div>
          <label className="checkbox-row confirm-check">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            我已核对收发货资料、货物和报价
          </label>
          {error && (
            <p className="notice error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <span className="small muted">修改运输资料后需重新询价</span>
            <Button disabled={!checked || busy} onClick={submit}>
              {busy ? "正在提交…" : "确认提交订单"}
              <Check size={16} />
            </Button>
          </div>
        </div>
        <Summary draft={state.draft} amount={quote.amountMinor} />
      </div>
    </>
  );
}
