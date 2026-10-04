"use client";

import Link from "next/link";
import { useState } from "react";
import Decimal from "decimal.js";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  Empty,
  ErrorNotice,
  Status,
  api,
  useOperation,
  useNow,
  time,
  usd,
} from "./shared";
import type { Inquiry, Quote } from "./types";

export function QuoteOptions({
  inquiry,
  staff = false,
}: {
  inquiry: Inquiry;
  staff?: boolean;
}) {
  const now = useNow(),
    operation = useOperation();
  const [sort, setSort] = useState("price"),
    [publishing, setPublishing] = useState<Quote | null>(null);
  const expired = (quote: Quote) =>
    now > 0 && Date.parse(quote.expiresAt) <= now;
  const quotes = [...inquiry.quotes].sort((a, b) => {
    const availableOrder = Number(expired(a)) - Number(expired(b));
    if (availableOrder) return availableOrder;
    if (sort === "expiry")
      return Date.parse(b.expiresAt) - Date.parse(a.expiresAt);
    return (
      new Decimal(a.amount).comparedTo(b.amount) *
      (sort === "price-desc" ? -1 : 1)
    );
  });
  if (!quotes.length)
    return (
      <Empty
        text={
          inquiry.status === "no_quote"
            ? "当前暂无可用方案"
            : "等待运营发布报价"
        }
      />
    );
  return (
    <div className="flex flex-col gap-5">
      {quotes.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            共 {quotes.length} 个方案 · 过期方案排在最后
          </p>
          <Field orientation="horizontal" className="w-full sm:w-auto">
            <FieldLabel htmlFor="quote-sort" className="shrink-0">
              排序
            </FieldLabel>
            <div className="w-full sm:w-48">
              <NativeSelect
                id="quote-sort"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <NativeSelectOption value="price">
                  总价从低到高
                </NativeSelectOption>
                <NativeSelectOption value="price-desc">
                  总价从高到低
                </NativeSelectOption>
                <NativeSelectOption value="expiry">
                  有效期从长到短
                </NativeSelectOption>
              </NativeSelect>
            </div>
          </Field>
        </div>
      )}
      <div className="grid items-start gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {quotes.map((quote) => (
          <Card key={quote.id}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>{quote.carrier}</CardTitle>
                {expired(quote) ? (
                  <Badge variant="secondary">已过期</Badge>
                ) : quote.status === "published" ? (
                  <Badge variant="outline">可选方案</Badge>
                ) : (
                  <Status value={quote.status} />
                )}
              </div>
              <CardDescription>
                参考时效：{quote.transit || "待确认"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    运输总价 · USD
                  </p>
                  <p className="text-2xl font-semibold tabular-nums">
                    {usd(quote.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">有效至</p>
                  <p className="text-sm">{time(quote.expiresAt)}</p>
                </div>
                <Accordion type="single" collapsible>
                  <AccordionItem value="fees">
                    <AccordionTrigger>
                      费用明细 · {quote.fees.length} 项
                    </AccordionTrigger>
                    <AccordionContent>
                      <dl className="flex flex-col gap-3">
                        {quote.fees.map((fee, index) => (
                          <div
                            key={index}
                            className="flex justify-between gap-3"
                          >
                            <dt className="min-w-0 break-words">{fee.label}</dt>
                            <dd className="shrink-0 tabular-nums">
                              {usd(fee.amount)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </CardContent>
            <CardFooter>
              {staff ? (
                quote.status === "draft" ? (
                  <Button
                    className="w-full"
                    disabled={
                      operation.busy ||
                      !!inquiry.order ||
                      expired(quote) ||
                      !now
                    }
                    onClick={() => setPublishing(quote)}
                  >
                    发布给客户
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {expired(quote) ? "有效期已结束" : "客户已可查看此方案"}
                  </p>
                )
              ) : inquiry.order ? (
                <p className="text-sm text-muted-foreground">本次询价已下单</p>
              ) : expired(quote) || !now ? (
                <Button className="w-full" disabled>
                  {expired(quote) ? "方案已过期" : "正在核对有效期…"}
                </Button>
              ) : (
                <Button className="w-full" asChild>
                  <Link
                    href={`/portal/orders/new?inquiry=${inquiry.id}&quote=${quote.id}`}
                  >
                    选择方案
                  </Link>
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
      <AlertDialog
        open={!!publishing}
        onOpenChange={(open) => {
          if (!open && !operation.busy) setPublishing(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认发布报价</AlertDialogTitle>
            <AlertDialogDescription>
              发布后，客户可查看并选择此方案。请确认承运商、费用和有效期。
            </AlertDialogDescription>
          </AlertDialogHeader>
          {publishing && (
            <dl className="flex flex-col gap-3">
              <div className="flex justify-between gap-4">
                <dt>承运商</dt>
                <dd>{publishing.carrier}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>客户报价</dt>
                <dd className="tabular-nums">{usd(publishing.amount)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>参考时效</dt>
                <dd>{publishing.transit}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>有效至</dt>
                <dd>{time(publishing.expiresAt)}</dd>
              </div>
            </dl>
          )}
          <ErrorNotice message={operation.error} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={operation.busy}>
              返回核对
            </AlertDialogCancel>
            <Button
              disabled={operation.busy || !publishing || expired(publishing)}
              onClick={async () => {
                if (!publishing) return;
                const result = await operation.run(() =>
                  api(`quotes/${publishing.id}/publish`, "POST"),
                );
                if (result) setPublishing(null);
              }}
            >
              {operation.busy && <Spinner data-icon="inline-start" />}确认发布
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
