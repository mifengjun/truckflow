"use client";
import { Field as UiField, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table as UiTable,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty as UiEmpty,
  EmptyHeader,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import Link from "next/link";
import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  useQuery,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
export function BusinessSection({
  title,
  description,
  children,
  footer,
}: {
  title: ReactNode;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{title}</h2>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  method = "GET",
  data?: unknown,
  key?: string,
): Promise<T> {
  const multipart = data instanceof FormData;
  const response = await fetch(`/api/v1/${path}`, {
    method,
    cache: "no-store",
    headers: {
      ...(!multipart && method !== "GET"
        ? { "Content-Type": "application/json" }
        : {}),
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    body:
      method === "GET"
        ? undefined
        : multipart
          ? data
          : JSON.stringify(data ?? {}),
  });
  const result = await response.json();
  if (!response.ok)
    throw new ApiError(result.message || "请求失败，请重试", response.status);
  return result;
}
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, staleTime: 0, refetchOnWindowFocus: true },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
export function useData<T>(path: string) {
  return useQuery<T, Error>({
    queryKey: ["business", path],
    queryFn: () => api<T>(path),
  });
}
export function useOperation() {
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    client = useQueryClient();
  async function run<T>(operation: () => Promise<T>): Promise<T | undefined> {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await operation();
      await client.invalidateQueries({ queryKey: ["business"] });
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败，请重试");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return { busy, error, run };
}
export function ErrorNotice({ message }: { message?: string }) {
  return message ? (
    <Alert variant="destructive">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  ) : null;
}
export function Loading({
  error,
  retry,
}: {
  error?: Error | null;
  retry?: () => void;
}) {
  return error ? (
    <>
      <ErrorNotice message={error.message} />
      {retry && (
        <Button variant="outline" onClick={retry}>
          重试
        </Button>
      )}
    </>
  ) : (
    <div className="panel" role="status">
      <span className="sr-only">正在加载数据…</span>
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="mt-4 h-20 w-full" />
    </div>
  );
}
export function Heading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">TRUCKFLOW / 美国 LTL</div>
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Field({
  label,
  name,
  type = "text",
  required = true,
  value,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  value?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value">) {
  return (
    <UiField className="form-field">
      <FieldLabel htmlFor={name}>
        {label}
        {required && <span> *</span>}
      </FieldLabel>
      <Input
        id={name}
        name={name}

        type={type}
        required={required}
        defaultValue={value}
        {...rest}
      />
    </UiField>
  );
}
export const labels: Record<string, string> = {
  pending: "待处理",
  quoted: "已报价",
  ordered: "已下单",
  no_quote: "暂无报价",
  pending_review: "待审核",
  submitting: "正在下单",
  accepted: "已接单",
  failed: "已拒单",
  unknown: "结果待核实",
  verified: "已入账",
  rejected: "已驳回",
  draft: "草稿",
  published: "已发布",
  awaiting_pickup: "待提货",
  picked_up: "已提货",
  in_transit: "运输中",
  delivered: "已送达",
  active: "正常",
  frozen: "已冻结",
  recharge: "充值",
  freeze: "冻结",
  capture: "扣款",
  release: "解冻",
  sent: "邀请已发送",
};
export function Status({ value }: { value: string }) {
  return (
    <Badge
      variant={
        ["accepted", "verified", "delivered", "published", "active"].includes(
          value,
        )
          ? "success"
          : ["failed", "rejected", "frozen"].includes(value)
            ? "error"
            : ["unknown", "pending", "pending_review", "draft"].includes(value)
              ? "warning"
              : "info"
      }
    >
      {labels[value] ?? value}
    </Badge>
  );
}
export function usd(value: string) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}
export function time(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    timeZoneName: "short",
    hour12: false,
  });
}
export function Empty({ text }: { text: string }) {
  return (
    <UiEmpty>
      <EmptyHeader>
        <EmptyDescription>{text}</EmptyDescription>
      </EmptyHeader>
    </UiEmpty>
  );
}
export function Pager({
  page,
  setPage,
  length,
}: {
  page: number;
  setPage: (p: number) => void;
  length: number;
}) {
  return (
    <Pagination aria-label="列表分页">
      <PaginationContent>
        <PaginationItem>
          <Button
            type="button"
            variant="outline"
            disabled={!page}
            onClick={() => setPage(page - 1)}
          >
            上一页
          </Button>
        </PaginationItem>
        <PaginationItem>
          <span aria-live="polite">第 {page + 1} 页</span>
        </PaginationItem>
        <PaginationItem>
          <Button
            type="button"
            variant="outline"
            disabled={length < 20}
            onClick={() => setPage(page + 1)}
          >
            下一页
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
export function Table({
  head,
  children,
}: {
  head: string[];
  children: ReactNode;
}) {
  return (
    <div className="table-scroll">
      <UiTable className="data-table">
        <TableHeader>
          <TableRow>
            {head.map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </UiTable>
    </div>
  );
}
export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="business-link" href={href}>
      {children}
    </Link>
  );
}

export function useNow() {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = setInterval(update, 15000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
