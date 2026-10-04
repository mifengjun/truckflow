import Link from "next/link";
import { Truck, FileText, ClipboardCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
export default function Home() {
  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-6xl px-5 py-6 md:px-8"
    >
      <header className="flex items-center justify-between gap-4 border-b pb-5">
        <Link href="/" className="flex items-center gap-3 font-semibold">
          <Truck className="text-primary" aria-hidden />
          Truckflow
        </Link>
        <Button variant="ghost" asChild>
          <Link href="/login">已有账号登录</Link>
        </Button>
      </header>
      <section className="grid gap-10 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
        <div className="flex flex-col items-start gap-6">
          <p className="text-sm font-medium text-primary">
            美国 LTL · 中文服务
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            把卡派需求交给我们，
            <br />
            从一次询价开始。
          </h1>
          <p className="max-w-lg text-base leading-7 text-muted-foreground">
            填写提货与送货地址、货物尺寸和重量，运营人员为你准备运输报价。报价、订单与运输单据，在同一个工作区查看。
          </p>
          <Button size="lg" asChild>
            <Link href="/register">注册并询价</Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            询价无需充值 · 报价由运营人工确认
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>询价前，准备这些资料</CardTitle>
            <CardDescription>信息越完整，越方便确认运输方案。</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-5 text-sm leading-6">
              <li>提货和送货地址、邮编、联系人</li>
              <li>托盘或货件数量、单件重量与长宽高</li>
              <li>预计提货日期和所需附加服务</li>
              <li>美国 LTL；重量使用 lb，尺寸使用 in</li>
            </ul>
          </CardContent>
        </Card>
      </section>
      <section className="border-t py-10">
        <h2 className="mb-6 text-2xl font-semibold">从需求到运输，步骤清楚</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: FileText,
              title: "1. 注册并提交询价",
              text: "验证邮箱，建立客户资料，填写运输需求。",
            },
            {
              icon: ClipboardCheck,
              title: "2. 查看人工报价",
              text: "运营确认方案后发布报价，费用和有效期清楚展示。",
            },
            {
              icon: Wallet,
              title: "3. 充值并确认订单",
              text: "选择报价后按预付规则下单，运营审核并安排运输。",
            },
          ].map((s) => (
            <Card key={s.title}>
              <CardHeader>
                <s.icon className="size-5 text-primary" aria-hidden />
                <CardTitle>{s.title}</CardTitle>
                <CardDescription>{s.text}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
      <footer className="border-t py-6 text-sm text-muted-foreground">
        Truckflow · 美国 LTL 卡派协同
      </footer>
    </main>
  );
}
