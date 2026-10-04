"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useNow } from "../use-now";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, RefreshCw, Clock3, Truck } from "lucide-react";
import { usePrototype } from "../provider";
import { fetchMockQuotes } from "../mock-adapter";
import { money } from "../model";
import { inquirySchema } from "../validation";
import { Button } from "@/components/ui/button";
import {
  PageHeading,
  AddressSummary,
  EmptyState,
} from "@/components/prototype/shared";
export function Quotes() {
  const now = useNow();
  const { state, setState, scenario } = usePrototype();
  const params = useSearchParams();
  const valid =
    inquirySchema.safeParse(state.draft).success &&
    state.draft.mode === "LTL" &&
    !state.draft.goods.some((g) => g.dangerous);
  const query = useQuery({
    queryKey: ["quotes", state.draft.revision, scenario, params.get("request")],
    queryFn: () => fetchMockQuotes(state.draft, scenario),
    enabled: valid,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    initialData:
      params.get("request") !== "1" &&
      scenario === "default" &&
      state.quotes.length &&
      state.quotes[0].draftRevision === state.draft.revision
        ? state.quotes
        : undefined,
  });
  useEffect(() => {
    if (query.data)
      setState((s) =>
        s.draft.revision === query.data?.[0]?.draftRevision ||
        !query.data?.length
          ? { ...s, quotes: query.data! }
          : s,
      );
  }, [query.data, setState]);
  return (
    <>
      <Link className="back-link" href="/prototype/portal/inquiry?step=cargo">
        <ArrowLeft size={15} />
        返回修改运输资料
      </Link>
      <PageHeading
        eyebrow="QUOTE COMPARISON / 比较报价"
        title="选择适合这次运输的方案"
        description="比较总价、服务和参考时效。所有金额均以 USD 展示。"
        action={
          <Button
            variant="outline"
            disabled={query.isFetching || !valid}
            onClick={() => query.refetch()}
          >
            <RefreshCw size={15} />
            重新询价
          </Button>
        }
      />
      <section className="panel route-panel">
        <AddressSummary draft={state.draft} />
        <div className="route-meta">
          <span>
            {state.draft.mode} · {state.draft.pallets} 托盘
          </span>
          <span>提货 {state.draft.date}</span>
          <span>客户参考号 {state.draft.reference || "未填写"}</span>
        </div>
      </section>
      {!valid ? (
        <div className="notice warning">
          请先完整填写询价信息，当前资料暂不可报价。
          <Link href="/prototype/portal/inquiry"> 返回询价</Link>
        </div>
      ) : query.isFetching || scenario === "loading" ? (
        <div className="panel skeleton" role="status">
          <h2>正在查询承运商运价…</h2>
          <div />
          <div />
          <div />
        </div>
      ) : query.isError ? (
        <div className="panel empty-state">
          <h2>本次报价请求失败</h2>
          <p>输入资料已保留，请重试或切换默认评审场景。</p>
          <Button variant="outline" onClick={() => query.refetch()}>
            重试报价
          </Button>
        </div>
      ) : !query.data?.length ? (
        <div className="panel">
          <EmptyState
            title="暂未找到可用报价"
            description="此路线暂无承运方案，可以修改提货日期或联系运营确认。"
            action={
              <Button asChild variant="outline">
                <Link href="/prototype/portal/inquiry">修改询价</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="quote-heading">
            <h2>{query.data.length} 个承运方案</h2>
            <span>
              <Clock3 size={14} />
              示例报价有效期 30 分钟
            </span>
          </div>
          {scenario === "partial" && (
            <div className="notice warning">
              XPO Logistics 暂未返回报价，其他方案仍可选择。
              <Button size="sm" variant="ghost" onClick={() => query.refetch()}>
                重试本次询价
              </Button>
            </div>
          )}
          <div className="quote-list">
            {query.data.map((quote, i) => {
              const expired = quote.expiresAt <= now;
              return (
                <article className="panel quote" key={quote.id}>
                  <div className="quote-main">
                    <div className="carrier">
                      <span className="carrier-logo">
                        <Truck size={22} />
                      </span>
                      <div>
                        <h2>{quote.carrier}</h2>
                        <p>标准零担 · 方案 {String(i + 1).padStart(2, "0")}</p>
                      </div>
                    </div>
                    <div className="quote-time">
                      <small>参考时效</small>
                      <strong>{quote.days}</strong>
                      <span>非承诺送达时间</span>
                    </div>
                    <div className="quote-price">
                      <small>总价 · USD</small>
                      <strong>{money(quote.amountMinor)}</strong>
                      <span>含所选附加服务</span>
                    </div>
                    {expired ? (
                      <Button disabled>报价已过期</Button>
                    ) : (
                      <Button asChild>
                        <Link
                          href={`/prototype/portal/confirm?quote=${encodeURIComponent(quote.id)}`}
                        >
                          选择报价
                          <ArrowRight size={15} />
                        </Link>
                      </Button>
                    )}
                  </div>
                  <details>
                    <summary>
                      查看费用明细<span>基础运费、燃油及附加服务</span>
                    </summary>
                    <dl className="fee-details">
                      {quote.fees.map((f) => (
                        <div key={f.name}>
                          <dt>{f.name}</dt>
                          <dd>{money(f.amountMinor)}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                  {expired && (
                    <p className="field-error">此报价已过期，请重新询价。</p>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
      <p className="footnote">
        承运商、费用和时效均为示例。正式接入后，以承运商返回的服务范围、有效期和费用规则为准。
      </p>
    </>
  );
}
