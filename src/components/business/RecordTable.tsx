"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@/components/ui/input-group";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorNotice, api } from "./shared";
import { useQuery } from "@tanstack/react-query";
import type { ListPage } from "./types";

const filterKeys = [
  "search",
  "status",
  "from",
  "to",
  "sort",
  "direction",
  "page",
];
export function RecordTable<T extends { id: string }>({
  endpoint,
  columns,
  states,
  searchPlaceholder,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  endpoint: "orders" | "inquiries";
  columns: ColumnDef<T>[];
  states: { id: string; text: string }[];
  searchPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: ReactNode;
}) {
  const params = useSearchParams(),
    pathname = usePathname(),
    router = useRouter();
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [dateError, setDateError] = useState("");
  const pageValue = Number(params.get("page") ?? 0);
  const page =
    Number.isInteger(pageValue) && pageValue >= 0 && pageValue <= 10000
      ? pageValue
      : 0;
  const apiParams = new URLSearchParams({ format: "page", page: String(page) });
  filterKeys
    .filter((key) => key !== "page")
    .forEach((key) => {
      if (params.has(key)) apiParams.set(key, params.get(key)!);
    });
  const queryPath = `${endpoint}?${apiParams}`;
  const query = useQuery<ListPage<T>, Error>({
    queryKey: ["business", queryPath],
    queryFn: () => api<ListPage<T>>(queryPath),
  });
  const data = query.data;
  const sorting: SortingState = [
    {
      id: params.get("sort") || "createdAt",
      desc: params.get("direction") !== "asc",
    },
  ];
  function update(patch: Record<string, string>) {
    setDateError("");
    const next = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    const search = next.toString();
    router.replace(`${pathname}${search ? `?${search}` : ""}`, {
      scroll: false,
    });
  }
  function reset() {
    update(Object.fromEntries(filterKeys.map((key) => [key, ""])));
  }
  // This table intentionally stays outside React Compiler memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data?.rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    defaultColumn: { enableSorting: false },
    state: { sorting, columnVisibility: visibility },
    manualSorting: true,
    enableSortingRemoval: false,
    onSortingChange: (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      if (next[0])
        update({
          sort: next[0].id,
          direction: next[0].desc ? "desc" : "asc",
          page: "",
        });
    },
    onColumnVisibilityChange: setVisibility,
  });
  const activeFilters = ["search", "status", "from", "to"].some((key) =>
    params.get(key),
  );
  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : 1;
  return (
    <div className="flex flex-col gap-5">
      <form
        key={params.toString()}
        onSubmit={(event) => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          const from = String(fields.get("from") ?? ""),
            to = String(fields.get("to") ?? "");
          if (from && to && from > to) {
            setDateError("结束日期不能早于开始日期");
            event.currentTarget
              .querySelector<HTMLInputElement>(`#${endpoint}-to`)
              ?.focus();
            return;
          }
          update({
            search: String(fields.get("search") ?? "").trim(),
            status: String(fields.get("status") ?? ""),
            from: String(fields.get("from") ?? ""),
            to: String(fields.get("to") ?? ""),
            page: "",
          });
        }}
      >
        <FieldGroup className="grid grid-cols-2 items-end gap-4 xl:grid-cols-[minmax(220px,2fr)_minmax(130px,1fr)_minmax(130px,1fr)_minmax(130px,1fr)_auto]">
          <Field className="col-span-2 xl:col-span-1">
            <FieldLabel htmlFor={`${endpoint}-search`}>
              搜索{endpoint === "orders" ? "订单" : "询价"}
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                id={`${endpoint}-search`}
                name="search"
                defaultValue={params.get("search") ?? ""}
                placeholder={searchPlaceholder}
                maxLength={100}
              />
              <InputGroupAddon>
                <Search aria-hidden />
              </InputGroupAddon>
            </InputGroup>
          </Field>
          <Field className="col-span-2 sm:col-span-1">
            <FieldLabel htmlFor={`${endpoint}-status`}>状态</FieldLabel>
            <NativeSelect
              id={`${endpoint}-status`}
              name="status"
              defaultValue={params.get("status") ?? ""}
            >
              <NativeSelectOption value="">全部状态</NativeSelectOption>
              {states.map((state) => (
                <NativeSelectOption key={state.id} value={state.id}>
                  {state.text}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor={`${endpoint}-from`}>提货日期起</FieldLabel>
            <Input
              id={`${endpoint}-from`}
              name="from"
              type="date"
              defaultValue={params.get("from") ?? ""}
            />
          </Field>
          <Field data-invalid={!!dateError}>
            <FieldLabel htmlFor={`${endpoint}-to`}>提货日期止</FieldLabel>
            <Input
              id={`${endpoint}-to`}
              name="to"
              type="date"
              aria-invalid={!!dateError}
              aria-describedby={
                dateError ? `${endpoint}-date-error` : undefined
              }
              onChange={() => setDateError("")}
              defaultValue={params.get("to") ?? ""}
            />
            {dateError && (
              <FieldError id={`${endpoint}-date-error`}>{dateError}</FieldError>
            )}
          </Field>
          <div className="col-span-2 flex gap-2 sm:col-span-1">
            <Button type="submit">查询</Button>
            {activeFilters && (
              <Button type="button" variant="outline" onClick={reset}>
                重置
              </Button>
            )}
          </div>
        </FieldGroup>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          aria-live="polite"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          {query.isFetching && <Spinner />}
          {data
            ? `共 ${data.total.toLocaleString("zh-CN")} 条记录${activeFilters ? " · 已筛选" : ""}`
            : query.error
              ? "加载失败"
              : "正在加载记录…"}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Columns3 data-icon="inline-start" />
              显示列
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              {table
                .getAllLeafColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(visible) =>
                      column.toggleVisibility(visible)
                    }
                  >
                    {typeof column.columnDef.header === "string"
                      ? column.columnDef.header
                      : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {query.error && (
        <div className="flex flex-col items-start gap-3">
          <ErrorNotice message={query.error.message} />
          <Button variant="outline" onClick={() => void query.refetch()}>
            重试
          </Button>
        </div>
      )}
      {!data && !query.error ? (
        <div
          className="flex flex-col gap-3"
          role="status"
          aria-label="正在加载列表"
        >
          {[0, 1, 2, 3, 4].map((index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        data && (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((group) => (
                    <TableRow key={group.id}>
                      {group.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          aria-sort={
                            header.column.getCanSort()
                              ? header.column.getIsSorted() === "asc"
                                ? "ascending"
                                : header.column.getIsSorted() === "desc"
                                  ? "descending"
                                  : "none"
                              : undefined
                          }
                        >
                          {header.isPlaceholder ? null : header.column.getCanSort() ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                              {header.column.getIsSorted() === "asc" ? (
                                <ArrowUp data-icon="inline-end" />
                              ) : header.column.getIsSorted() === "desc" ? (
                                <ArrowDown data-icon="inline-end" />
                              ) : (
                                <ArrowUpDown data-icon="inline-end" />
                              )}
                            </Button>
                          ) : (
                            flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!data.rows.length && (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>
                    {activeFilters
                      ? "没有符合条件的记录"
                      : page > 0
                        ? "这一页暂无记录"
                        : emptyTitle}
                  </EmptyTitle>
                  <EmptyDescription>
                    {activeFilters
                      ? "调整搜索内容、状态或提货日期后重新查询。"
                      : page > 0
                        ? "记录可能已发生变化，请返回首页查看。"
                        : emptyDescription}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  {activeFilters ? (
                    <Button variant="outline" onClick={reset}>
                      清除筛选
                    </Button>
                  ) : page > 0 ? (
                    <Button
                      variant="outline"
                      onClick={() => update({ page: "" })}
                    >
                      返回首页
                    </Button>
                  ) : (
                    emptyAction
                  )}
                </EmptyContent>
              </Empty>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {data.total && data.rows.length
                  ? `${page * data.pageSize + 1}–${page * data.pageSize + data.rows.length} / ${data.total} 条`
                  : `0 / ${data.total} 条`}
              </p>
              <Pagination className="mx-0 w-auto" aria-label="记录分页">
                <PaginationContent>
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!page || query.isFetching}
                      onClick={() => update({ page: String(page - 1) })}
                    >
                      <ChevronLeft data-icon="inline-start" />
                      上一页
                    </Button>
                  </PaginationItem>
                  <PaginationItem>
                    <span className="px-2 text-sm" aria-live="polite">
                      第 {page + 1} / {totalPages} 页
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page + 1 >= totalPages || query.isFetching}
                      onClick={() => update({ page: String(page + 1) })}
                    >
                      下一页
                      <ChevronRight data-icon="inline-end" />
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </>
        )
      )}
    </div>
  );
}
