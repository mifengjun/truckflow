"use client";
import { useState, useEffect } from "react";
import { Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, Field, ErrorNotice } from "./shared";
export function AuthForm({ setup = false }: { setup?: boolean }) {
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
      queueMicrotask(() => setError("邀请链接已失效，请联系管理员重新发送。"));
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
    <main id="main-content" className="business-auth">
      <div className="brand">
        <Truck />
        <span>
          Truckflow<small>卡派协同工作台</small>
        </span>
      </div>
      <div className="panel">
        <h1>
          {mode === "setup"
            ? "设置账号密码"
            : mode === "recover"
              ? "找回密码"
              : "登录工作区"}
        </h1>
        <p className="page-description">
          {mode === "setup"
            ? "账号由管理员邀请开通，请设置至少 12 位密码。"
            : "使用管理员邀请的账号，进入客户中心或管理后台。"}
        </p>
        <ErrorNotice message={error} />
        {message && (
          <div className="notice" role="status">
            {message}
          </div>
        )}
        {accepting ? (
          <p role="status">正在验证邀请…</p>
        ) : (
          <form className="business-stack" onSubmit={submit}>
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
                minLength={mode === "setup" ? 12 : 1}
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
                minLength={12}
                autoComplete="new-password"
              />
            )}
            <Button disabled={busy}>
              {busy
                ? "处理中…"
                : mode === "setup"
                  ? "设置密码并进入系统"
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
          </form>
        )}
      </div>
    </main>
  );
}
