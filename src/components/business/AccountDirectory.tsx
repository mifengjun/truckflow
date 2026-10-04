"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Empty, Loading, Table, useData } from "./shared";
import type { Role } from "@/modules/business/rules";
const labels: Record<Role, string> = {
  customer_operator: "客户业务",
  customer_finance: "客户财务",
  operations: "运营",
  finance: "财务",
  admin: "管理员",
  cost_view: "成本查看",
};
type Account = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  roles: Role[];
};
export function AccountDirectory({
  endpoint,
  staff = false,
}: {
  endpoint: string;
  staff?: boolean;
}) {
  const [page, setPage] = useState(0);
  const q = useData<{ items: Account[]; hasMore: boolean }>(
    `${endpoint}?page=${page}`,
  );
  if (!q.data) return <Loading error={q.error} retry={() => q.refetch()} />;
  return (
    <div className="flex flex-col gap-4">
      {q.data.items.length ? (
        <Table head={["姓名", "登录邮箱", "角色权限", "账号状态"]}>
          {q.data.items.map((account) => (
            <TableRow key={account.id}>
              <TableCell>{account.name}</TableCell>
              <TableCell className="break-all">{account.email}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  {account.roles.map((role) => (
                    <Badge key={role} variant="secondary">
                      {labels[role]}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={account.active ? "outline" : "secondary"}>
                  {account.active ? "正常" : "已停用"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      ) : (
        <Empty
          text={staff ? "暂无员工账号" : "暂无成员账号，可邀请该客户的同事加入"}
        />
      )}
      {(page > 0 || q.data.hasMore) && (
        <nav
          aria-label="账号列表分页"
          className="flex items-center justify-end gap-3"
        >
          <Button
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            上一页
          </Button>
          <span className="text-sm text-muted-foreground">
            第 {page + 1} 页
          </span>
          <Button
            variant="outline"
            disabled={!q.data.hasMore}
            onClick={() => setPage(page + 1)}
          >
            下一页
          </Button>
        </nav>
      )}
    </div>
  );
}
