"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthFrame } from "./AuthFrame";
import { api, ErrorNotice } from "./shared";
export function VerificationNotice({
  invalid,
  enabled,
  email,
}: {
  invalid: boolean;
  enabled: boolean;
  email: string;
}) {
  const router = useRouter();
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [failed, setFailed] = useState(invalid),
    [seconds, setSeconds] = useState(email && !invalid ? 60 : 0);
  const started = useRef(false);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds(seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const p = new URLSearchParams(window.location.hash.slice(1)),
      access_token = p.get("access_token"),
      refresh_token = p.get("refresh_token");
    if (window.location.hash)
      history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    const go = (r: { destination: string }) => {
      router.replace(r.destination);
      router.refresh();
    };
    if (p.has("error") || invalid) {
      queueMicrotask(() => setFailed(true));
      // A consumed link can still resume an already verified session.
      api<{ destination: string }>("auth/onboarding")
        .then(go)
        .catch(() =>
          setError(
            "验证链接已使用或过期。请重新发送邮件，已有账号也可直接登录。",
          ),
        );
      return;
    }
    if (access_token && refresh_token) {
      queueMicrotask(() => setBusy(true));
      api<{ destination: string }>("auth/accept", "POST", {
        access_token,
        refresh_token,
      })
        .then(go)
        .catch((e) => {
          setFailed(true);
          setError(e.message);
        })
        .finally(() => setBusy(false));
    }
  }, [router, invalid]);
  return (
    <AuthFrame
      title={
        failed ? "验证链接无法使用" : email ? "请查收验证邮件" : "验证你的邮箱"
      }
      description={
        failed
          ? "重新获取邮件即可继续注册。已完成注册的账号可直接登录。"
          : "点击邮件中的链接验证邮箱，然后设置密码。没找到邮件时，也请检查垃圾邮件文件夹。"
      }
    >
      <FieldGroup>
        <ErrorNotice message={error} />
        {email && (
          <p className="text-sm break-all">
            验证邮件已发送至 <strong>{email}</strong>
          </p>
        )}
        {message && (
          <Alert role="status">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        {!enabled && (
          <Alert>
            <AlertDescription>
              邮件服务待配置，暂时无法发送验证邮件。已有账号请直接登录。
            </AlertDescription>
          </Alert>
        )}
        {busy && <p role="status">正在处理验证…</p>}
        {email && (
          <Button
            disabled={busy || !enabled || seconds > 0}
            onClick={async () => {
              setBusy(true);
              setError("");
              setMessage("");
              try {
                const r = await api<{ message: string }>(
                  "auth/resend",
                  "POST",
                  { email },
                );
                setMessage(r.message);
                setSeconds(60);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {seconds > 0 ? `${seconds} 秒后可重新发送` : "重新发送验证邮件"}
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href="/register">
            {email ? "修改邮箱" : "重新获取验证邮件"}
          </Link>
        </Button>
        <Button variant="link" asChild>
          <Link href="/login">返回登录</Link>
        </Button>
      </FieldGroup>
    </AuthFrame>
  );
}
