"use client";
import { useState, type CSSProperties } from "react";
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
  Building2,
  ChevronsUpDown,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
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
  { key: "customers", label: "客户管理", icon: Building2, role: "admin" },
  { key: "staff", label: "员工管理", icon: Users, role: "admin" },
  { key: "settlement", label: "充值核验", icon: Wallet, role: "finance" },
];
export function Shell(props: {
  actor: Actor;
  children: React.ReactNode;
  environment: string;
}) {
  return (
    <QueryProvider>
      <SidebarProvider
        className="production-app"
        style={{ "--sidebar-width": "15rem" } as CSSProperties}
      >
        <Workspace {...props} />
      </SidebarProvider>
    </QueryProvider>
  );
}
function Workspace({
  actor,
  children,
  environment,
}: {
  actor: Actor;
  children: React.ReactNode;
  environment: string;
}) {
  const router = useRouter(),
    path = usePathname(),
    staff = actor.identity === "staff",
    base = staff ? "/admin" : "/portal",
    workspace = staff ? "管理后台" : "客户中心";
  const { setOpenMobile } = useSidebar();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const items = nav.filter((n) =>
    staff
      ? ["orders", "inquiries", "customers", "staff", "settlement"].includes(
          n.key,
        ) &&
        (n.key !== "staff" || actor.allCustomers) &&
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
  const active = items.find((n) => path.startsWith(`${base}/${n.key}`));
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
    <>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="gap-6 px-4 py-6">
          <Link
            href={`${base}/${items[0]?.key ?? "orders"}`}
            className="flex items-center gap-3"
          >
            <Truck aria-hidden className="size-6" />
            <span className="font-semibold">
              Truckflow
              <span className="block text-xs text-sidebar-foreground/70">
                卡派协同工作台
              </span>
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>
              {staff ? "运营工作区" : "客户工作区"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <nav aria-label="主导航">
                <SidebarMenu>
                  {items.map((n) => (
                    <SidebarMenuItem key={n.key}>
                      <SidebarMenuButton
                        asChild
                        isActive={active?.key === n.key}
                        size="lg"
                      >
                        <Link
                          href={`${base}/${n.key}`}
                          aria-current={
                            active?.key === n.key ? "page" : undefined
                          }
                          onClick={() => setOpenMobile(false)}
                        >
                          <n.icon aria-hidden />
                          <span>{n.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </nav>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="gap-4 px-4 pb-5">
          <p className="text-xs text-sidebar-foreground/70">
            {environment === "production" ? "正式工作区" : "开发验证工作区"}
            <span className="mt-1 block">真实服务 · 数据保存到云端</span>
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg" aria-label="账号菜单">
                <Avatar>
                  <AvatarFallback>{actor.name[0]}</AvatarFallback>
                </Avatar>
                <span className="flex-1">
                  {actor.name}
                  <span className="block text-xs text-sidebar-foreground/70">
                    {staff ? "管理人员" : "客户账号"}
                  </span>
                </span>
                <ChevronsUpDown aria-hidden />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start">
              <DropdownMenuLabel>{actor.name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  disabled={busy}
                  onSelect={() => void logout()}
                >
                  <LogOut aria-hidden />
                  {busy ? "正在退出…" : "退出登录"}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4 md:px-6">
          <SidebarTrigger aria-label="切换导航" />
          <Separator orientation="vertical" className="h-5" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`${base}/${items[0]?.key ?? "orders"}`}>
                    {workspace}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {active && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{active.label}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
          <span className="ml-auto hidden text-xs text-muted-foreground sm:block">
            美国 LTL · USD / lb / in
          </span>
        </header>
        <main
          id="main-content"
          className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6"
        >
          <ErrorNotice message={error} />
          {children}
        </main>
        <footer className="px-6 py-4 text-xs text-muted-foreground">
          Truckflow ·{" "}
          {environment === "production" ? "业务工作区" : "开发验证环境"}
        </footer>
      </SidebarInset>
    </>
  );
}
