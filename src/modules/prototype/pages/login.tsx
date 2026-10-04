"use client";
import { useState } from "react";
import Link from "next/link";
import { Truck, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/prototype/FormField";
export function Login({ reset = false }: { reset?: boolean }) {
  const [error, setError] = useState("");
  return (
    <div className="login-layout">
      <div className="login-intro">
        <span className="brand-icon">
          <Truck size={24} />
        </span>

        <h1>
          让每一程运输，
          <br />
          都有清晰的下一步。
        </h1>
        <p>连接客户与运营，让询价、订单、物流和服务在同一工作区协同。</p>
        <div>
          <ShieldCheck size={18} />
          <span>交互原型 · 无需真实账户</span>
        </div>
      </div>
      <section className="panel login-form">
        <h2>{reset ? "找回密码" : "进入工作区"}</h2>
        <p className="page-description">
          {reset
            ? "确认找回密码的字段与反馈结构。"
            : "选择示例角色即可体验，表单仅用于状态评审。"}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(
              reset
                ? "找回申请为结构示例，尚未发送邮件。"
                : "账户验证尚未接入，请使用下方示例入口。",
            );
          }}
        >
          <FormField label="示例账户邮箱" hint="请勿填写真实账户信息">
            <Input
              type="email"
              autoComplete="off"
              defaultValue="demo@example.com"
              required
            />
          </FormField>
          {!reset && (
            <FormField label="密码字段（演示，不输入真实密码）">
              <Input
                type="password"
                value="prototype-only"
                readOnly
                autoComplete="off"
              />
            </FormField>
          )}
          {error && (
            <p className="notice warning" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" variant="outline">
            {reset ? "查看找回反馈" : "查看登录反馈"}
          </Button>
        </form>
        <div className="login-links">
          {reset ? (
            <Link href="/prototype/login">返回登录</Link>
          ) : (
            <Link href="/prototype/reset-password">找回密码</Link>
          )}
        </div>
        <div className="login-demo">
          <Button asChild>
            <Link href="/prototype/portal/orders">
              进入客户示例
              <ArrowRight size={15} />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/prototype/admin/orders">进入管理后台示例</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
