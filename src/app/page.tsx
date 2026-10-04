import Link from "next/link";
import { CalendarDays, Check, MapPin, Package, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const inquiryDetails = [
  {
    icon: MapPin,
    title: "提货与送货地址",
    description: "完整地址、邮编、联系人及电话。",
  },
  {
    icon: Package,
    title: "货物数量与尺寸",
    description: "托盘或货件数量、单件重量与长宽高。",
  },
  {
    icon: CalendarDays,
    title: "提货时间与附加服务",
    description: "预计提货日期，以及尾板、预约等需求。",
  },
];

const workflow = [
  {
    title: "注册并提交询价",
    description: "验证邮箱，建立客户资料，填写提送货地址和货物信息。",
    result: "询价无需充值",
  },
  {
    title: "查看并选择报价",
    description: "运营确认运输方案后发布报价，查看费用明细、时效和有效期。",
    result: "报价由运营人工确认",
  },
  {
    title: "充值并确认订单",
    description: "选择报价，按预付规则确认订单，由运营审核并安排运输。",
    result: "订单与运输单据统一查看",
  },
];

export default function Home() {
  return (
    <div className="production-home min-h-svh bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <header className="flex items-center justify-between gap-4 py-5">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <Truck className="size-6 shrink-0" aria-hidden="true" />
            <span>Truckflow</span>
            <span className="hidden text-sm font-normal text-muted-foreground sm:inline">
              美国 LTL 卡派
            </span>
          </Link>
          <nav aria-label="首页导航" className="flex items-center gap-2">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="#workflow">服务流程</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/login">登录工作区</Link>
            </Button>
          </nav>
        </header>
        <Separator />

        <main id="main-content">
          <section
            aria-labelledby="home-heading"
            className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:py-20"
          >
            <div className="flex flex-col items-start gap-6">
              <Badge variant="secondary">美国 LTL · 中文服务</Badge>
              <h1
                id="home-heading"
                className="font-semibold leading-tight tracking-tight"
              >
                美国卡派，
                <br />
                从一次询价开始。
              </h1>
              <p className="max-w-lg text-base leading-7 text-muted-foreground">
                告诉我们提送货地址、货物信息和提货时间，运营为你确认运输报价。从询价到下单，订单与单据都在同一个工作区。
              </p>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/register">注册并询价</Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/login">登录工作区</Link>
                </Button>
              </div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="size-4 shrink-0" aria-hidden="true" />
                先询价，再选择方案并充值下单
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>询价前，准备这些资料</h2>
                </CardTitle>
                <CardDescription>
                  一次提供完整信息，方便运营确认运输方案。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-5">
                  {inquiryDetails.map((detail, index) => (
                    <li key={detail.title} className="flex flex-col gap-5">
                      {index > 0 && <Separator />}
                      <div className="flex items-start gap-3">
                        <detail.icon
                          className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                        <div className="flex flex-col gap-1.5">
                          <h3 className="text-sm font-medium">
                            {detail.title}
                          </h3>
                          <p className="text-sm leading-6 text-muted-foreground">
                            {detail.description}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="flex-wrap gap-2 border-t">
                <span className="mr-auto text-sm text-muted-foreground">
                  统一使用美国运输单位
                </span>
                <div className="flex gap-2">
                  <Badge variant="outline">重量 lb</Badge>
                  <Badge variant="outline">尺寸 in</Badge>
                </div>
              </CardFooter>
            </Card>
          </section>

          <Separator />
          <section
            id="workflow"
            aria-labelledby="workflow-heading"
            className="flex scroll-mt-6 flex-col gap-8 py-10 sm:py-12"
          >
            <div className="flex flex-col gap-2">
              <h2 id="workflow-heading" className="text-2xl font-semibold">
                从询价到下单，三步完成
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                每一步的资料、费用和进度，都有清楚的记录。
              </p>
            </div>
            <ol className="grid gap-4 md:grid-cols-3">
              {workflow.map((step, index) => (
                <li key={step.title}>
                  <Card className="h-full">
                    <CardHeader>
                      <Badge variant="outline">第 {index + 1} 步</Badge>
                      <CardTitle className="mt-2">
                        <h3>{step.title}</h3>
                      </CardTitle>
                      <CardDescription className="leading-6">
                        {step.description}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="mt-auto gap-2">
                      <Check className="size-4 shrink-0" aria-hidden="true" />
                      <p className="text-sm">{step.result}</p>
                    </CardFooter>
                  </Card>
                </li>
              ))}
            </ol>
          </section>
        </main>

        <Separator />
        <footer>
          <div className="flex w-full flex-col gap-3 py-6 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p>Truckflow · 美国 LTL 卡派协同</p>
            <div className="flex items-center gap-2">
              <Button variant="link" size="sm" asChild>
                <Link href="/register">注册并询价</Link>
              </Button>
              <Separator orientation="vertical" className="self-stretch" />
              <Button variant="link" size="sm" asChild>
                <Link href="/login">登录工作区</Link>
              </Button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
