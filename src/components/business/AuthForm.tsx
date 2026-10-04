"use client";
import { FieldGroup } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useState, useEffect } from "react";
import Link from "next/link";
import { passwordInput } from "@/modules/business/auth-contracts";
import { AuthFrame } from "./AuthFrame";
import { Button } from "@/components/ui/button";
import { api, Field, ErrorNotice } from "./shared";
export function AuthForm({
  setup = false,
  registration = false,
}: {
  setup?: boolean;
  registration?: boolean;
}) {
  const [mode, setMode] = useState(setup ? "setup" : "login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [accepting, setAccepting] = useState(false);
  useEffect(() => {
    if (!setup) return;
    const params = new URLSearchParams(window.location.hash.slice(1));
    const access_token = params.get("access_token"),
      refresh_token = params.get("refresh_token");
    if (params.get("error_description")) {
      queueMicrotask(() => setError("验证链接已失效，请重新获取邮件。"));
      history.replaceState(null, "", window.location.pathname);
      return;
    }
    if (access_token && refresh_token) {
      queueMicrotask(() => setAccepting(true));
      history.replaceState(null, "", window.location.pathname);
      api("auth/accept", "POST", { access_token, refresh_token })
        .catch((e) => setError(e.message))
        .finally(() => setAccepting(false));
    }
  }, [setup]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const d = new FormData(e.currentTarget);
    try {
      if (mode === "setup" && d.get("password") !== d.get("confirm"))
        throw new Error("两次密码不一致");
      if (mode === "setup") {
        const parsed = passwordInput.safeParse(d.get("password"));
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
      }
      const result = await api<{ destination?: string; message?: string }>(
        `auth/${mode === "setup" ? "password" : mode === "recover" ? "recover" : "login"}`,
        "POST",
        mode === "setup"
          ? { password: d.get("password") }
          : mode === "recover"
            ? { email: d.get("email") }
            : Object.fromEntries(d),
      );
      if (result.destination) window.location.assign(result.destination);
      else setMessage(result.message ?? "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthFrame
      title={
        mode === "setup"
          ? "设置账号密码"
          : mode === "recover"
            ? "找回密码"
            : "登录工作区"
      }
      description={
        mode === "setup"
          ? registration
            ? "邮箱已验证。设置登录密码后，继续完善客户资料。密码至少 6 位，包含字母和数字。"
            : "请设置至少 6 位密码，包含字母和数字。"
          : "登录客户中心提交询价，或进入运营后台处理业务。"
      }
    >
      <ErrorNotice message={error} />
      {message && (
        <Alert role="status">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      {accepting ? (
        <p role="status">正在验证邮件…</p>
      ) : (
        <form className="business-stack" onSubmit={submit}>
          <FieldGroup>
            {mode !== "setup" && (
              <Field
                label="邮箱"
                name="email"
                type="email"
                autoComplete="email"
              />
            )}
            {mode !== "recover" && (
              <Field
                label="密码"
                name="password"
                type="password"
                minLength={mode === "setup" ? 6 : 1}
                autoComplete={
                  mode === "setup" ? "new-password" : "current-password"
                }
              />
            )}{" "}
            {mode === "setup" && (
              <Field
                label="再次输入密码"
                name="confirm"
                type="password"
                minLength={6}
                autoComplete="new-password"
              />
            )}
            <Button disabled={busy}>
              {busy
                ? "处理中…"
                : mode === "setup"
                  ? registration
                    ? "设置密码并继续"
                    : "设置密码并进入系统"
                  : mode === "recover"
                    ? "发送密码设置邮件"
                    : "登录"}
            </Button>
            {mode !== "setup" && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setMode(mode === "login" ? "recover" : "login");
                  setError("");
                  setMessage("");
                }}
              >
                {mode === "login" ? "忘记密码" : "返回登录"}
              </Button>
            )}
          </FieldGroup>
        </form>
      )}
      {mode !== "setup" && (
        <Button variant="link" asChild>
          <Link href="/register">注册客户账号</Link>
        </Button>
      )}
    </AuthFrame>
  );
}
