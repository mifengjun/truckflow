"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Truck,
  Package,
  Plus,
  FileText,
  MapPin,
  Wallet,
  Users,
  Menu,
} from "lucide-react";
import type { Actor } from "@/modules/business/rules";
import { QueryProvider, api, ErrorNotice } from "./shared";
const nav = [
  { key: "orders", label: "订单管理", icon: Package, role: "operations" },
  { key: "inquiry", label: "创建询价", icon: Plus, role: "customer_operator" },
  { key: "inquiries", label: "询价与报价", icon: FileText, role: "operations" },
  {
    key: "addresses",
    label: "地址簿",
    icon: MapPin,
    role: "customer_operator",
  },
  { key: "finance", label: "资金账户", icon: Wallet, role: "customer_finance" },
  { key: "customers", label: "客户与账号", icon: Users, role: "admin" },
  { key: "settlement", label: "充值核验", icon: Wallet, role: "finance" },
];
export function Shell({
  actor,
  children,
  environment,
}: {
  actor: Actor;
  children: React.ReactNode;
  environment: string;
}) {
  const router = useRouter();
  const path = usePathname(),
    staff = actor.identity === "staff",
    base = staff ? "/admin" : "/portal",
    [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const items = nav.filter((n) =>
    staff
      ? ["orders", "inquiries", "customers", "settlement"].includes(n.key) &&
        actor.roles.includes(n.role as Actor["roles"][number])
      : ["orders", "inquiry", "inquiries", "addresses", "finance"].includes(
          n.key,
        ) &&
        actor.roles.includes(
          n.role === "operations"
            ? "customer_operator"
            : (n.role as Actor["roles"][number]),
        ),
  );
  async function logout() {
    setBusy(true);
    try {
      await api("auth/logout", "POST");
      router.replace("/login");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <QueryProvider>
      <div className="production-app app-frame">
        <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
          <Link className="brand" href={`${base}/${items[0]?.key ?? "orders"}`}>
            <span className="brand-icon">
              <Truck size={22} />
            </span>
            <span>
              Truckflow<small>卡派协同工作台</small>
            </span>
          </Link>
          <div className="workspace-label">
            {staff ? "运营工作区" : "客户工作区"}
          </div>
          <nav aria-label="主导航">
            {items.map((n) => (
              <Link
                key={n.key}
                href={`${base}/${n.key}`}
                aria-current={
                  path.startsWith(`${base}/${n.key}`) ? "page" : undefined
                }
                onClick={() => setOpen(false)}
              >
                <n.icon size={18} />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="support-note">
              <span className="status-dot" />
              {environment === "production" ? "正式工作区" : "开发验证工作区"}
              <small>真实服务 · 数据保存到云端</small>
            </div>
            <div className="account">
              <span className="avatar">{actor.name[0]}</span>
              <span>
                {actor.name}
                <small>{staff ? "管理人员" : "客户账号"}</small>
              </span>
            </div>
            <button
              className="button button-ghost"
              disabled={busy}
              onClick={logout}
            >
              {busy ? "正在退出…" : "退出登录"}
            </button>
          </div>
        </aside>
        {open && (
          <button
            className="sidebar-backdrop"
            aria-label="收起导航"
            onClick={() => setOpen(false)}
          />
        )}
        <div className="main-column">
          <header className="topbar">
            <div>
              <button
                className="mobile-menu"
                aria-label="展开导航"
                onClick={() => setOpen(!open)}
              >
                <Menu size={22} />
              </button>
              <span>{staff ? "管理后台" : "客户中心"}</span>
              <span className="topbar-slash">/</span>
              <span>美国 LTL · USD / lb / in</span>
            </div>
            <span>{actor.name}</span>
          </header>
          <main id="main-content" className="workspace">
            <ErrorNotice message={error} />
            {children}
          </main>
          <footer>
            Truckflow ·{" "}
            {environment === "production" ? "业务工作区" : "开发验证环境"}
          </footer>
        </div>
      </div>
    </QueryProvider>
  );
}
