"use client";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { catalog } from "@/modules/prototype/catalog";
import { IndexPage, Structure } from "@/modules/prototype/pages/structure";
import { Login } from "@/modules/prototype/pages/login";
import { EmptyState } from "@/components/prototype/shared";
import { Orders } from "@/modules/prototype/pages/orders";
import { Detail } from "@/modules/prototype/pages/detail";
import { Inquiry } from "@/modules/prototype/pages/inquiry";
import { Quotes } from "@/modules/prototype/pages/quotes";
import { Confirm } from "@/modules/prototype/pages/confirm";
import { PrototypeProvider } from "@/modules/prototype/provider";
import { AppShell } from "@/components/prototype/AppShell";
function Content() {
  const path = usePathname();
  const id = path.match(/\/orders\/(.+)$/)?.[1];
  const admin = path.includes("/admin");
  const spec = catalog.find((p) => p.path === path);
  return (
    <AppShell>
      {path.endsWith("/index") || path === "/prototype" ? (
        <IndexPage />
      ) : path.endsWith("/login") || path.endsWith("/reset-password") ? (
        <Login key={path} reset={path.endsWith("/reset-password")} />
      ) : path.endsWith("/inquiry") ? (
        <Inquiry />
      ) : path.endsWith("/quotes") ? (
        <Quotes />
      ) : path.endsWith("/confirm") ? (
        <Confirm />
      ) : id ? (
        <Detail key={path} id={id} admin={admin} />
      ) : path.endsWith("/orders") ? (
        <Orders admin={admin} />
      ) : spec ? (
        <Structure key={path} spec={spec} />
      ) : (
        <EmptyState
          title="页面未收录"
          description="请从左侧导航或页面索引选择原型页面。"
        />
      )}
    </AppShell>
  );
}
export default function Prototype() {
  return (
    <Suspense fallback={<div className="boot">正在加载原型…</div>}>
      <PrototypeProvider>
        <Content />
      </PrototypeProvider>
    </Suspense>
  );
}
