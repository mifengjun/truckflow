"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Truck,
  Package,
  FileText,
  MapPin,
  Wallet,
  MessagesSquare,
  Users,
  Warehouse,
  ChartNoAxesCombined,
  Plus,
  Menu,
  ChevronDown,
  ArrowUpRight,
} from "lucide-react";
import { catalog } from "@/modules/prototype/catalog";
import { ReviewToolbar } from "./ReviewToolbar";
import { usePrototype } from "@/modules/prototype/provider";
const icons: Record<string, typeof Package> = {
  orders: Package,
  inquiry: Plus,
  inquiries: FileText,
  addresses: MapPin,
  finance: Wallet,
  tickets: MessagesSquare,
  customers: Users,
  warehouses: Warehouse,
  carriers: Truck,
  settlement: Wallet,
  reports: ChartNoAxesCombined,
};
export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const admin = path.includes("/admin");
  const [open, setOpen] = useState(false);
  const { storageError } = usePrototype();
  return (
    <>
      <ReviewToolbar />
      <div className="app-frame">
        <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
          <Link
            href={`/prototype/${admin ? "admin" : "portal"}/orders`}
            className="brand"
          >
            <span className="brand-icon">
              <Truck size={22} />
            </span>
            <span>
              Truckflow<small>卡派协同工作台</small>
            </span>
          </Link>
          <div className="workspace-label">
            {admin ? "运营工作区" : "客户工作区"}
          </div>
          <nav aria-label="主导航">
            {catalog
              .filter((p) => p.nav && p.role === (admin ? "admin" : "portal"))
              .map((p) => {
                const key = p.path.split("/").pop()!;
                const Icon = icons[key] || Package;
                return (
                  <Link
                    onClick={() => setOpen(false)}
                    aria-current={path.includes(`/${key}`) ? "page" : undefined}
                    href={p.path}
                    key={p.id}
                  >
                    <Icon size={18} />
                    {p.name}
                    {key === "orders" && <span className="nav-dot" />}
                  </Link>
                );
              })}
          </nav>
          <div className="sidebar-bottom">
            <div className="support-note">
              <span className="status-dot" />
              示例工作区<small>流程可体验 · 数据仅保存在本机</small>
            </div>
            <Link href="/prototype/login" className="account">
              <span className="avatar">{admin ? "运" : "星"}</span>
              <span>
                {admin ? "运营管理员" : "星航跨境"}
                <small>{admin ? "运营团队 · 示例" : "客户管理员 · 示例"}</small>
              </span>
              <ChevronDown size={15} />
            </Link>
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
              <span>{admin ? "管理后台" : "客户中心"}</span>
              <span className="topbar-slash">/</span>
              <span>美国卡派 · 示例业务</span>
            </div>
            <Link href="/prototype/index">
              评审说明
              <ArrowUpRight size={14} />
            </Link>
          </header>
          {storageError && (
            <div className="notice error">
              浏览器存储不可用，当前修改仅在本次打开期间保留。
            </div>
          )}
          <main id="main-content" className="workspace">
            {children}
          </main>
          <footer>
            Truckflow · 交互原型{" "}
            <span>业务日期示例 · 物流时间 America/Los_Angeles</span>
          </footer>
        </div>
      </div>
    </>
  );
}
