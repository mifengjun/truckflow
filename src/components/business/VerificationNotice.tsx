"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthFrame } from "./AuthFrame";
import { api, ErrorNotice } from "./shared";
export function VerificationNotice({
  invalid,
  enabled,
}: {
  invalid: boolean;
  enabled: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const started = useRef(false);
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
    if (p.has("error")) {
      queueMicrotask(() =>
        setError("验证链接已失效，请重新发送验证邮件或返回登录。"),
      );
      return;
    }
    if (access_token && refresh_token) {
      queueMicrotask(() => setBusy(true));
      api<{ destination: string }>("auth/accept", "POST", {
        access_token,
        refresh_token,
      })
        .then((r) => {
          router.replace(r.destination);
          router.refresh();
        })
        .catch((e) => setError(e.message))
        .finally(() => setBusy(false));
    }
  }, [router]);
  return (
    <AuthFrame
      title={invalid ? "验证链接无法使用" : "验证你的邮箱"}
      description={
        invalid
          ? "链接可能已使用或过期。已验证过的账号可直接登录，否则请重新发送。"
          : "请打开邮件中的验证链接，然后完善客户资料。也请检查垃圾邮件文件夹。"
      }
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const email = new FormData(e.currentTarget).get("email");
          try {
            const r = await api<{ message: string }>("auth/resend", "POST", {
              email,
            });
            setMessage(r.message);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <FieldGroup>
          <ErrorNotice message={error} />
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
          <Field>
            <FieldLabel htmlFor="verify-email">注册邮箱</FieldLabel>
            <Input
              id="verify-email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </Field>
          <Button disabled={busy || !enabled}>重新发送验证邮件</Button>
          <Button variant="link" asChild>
            <Link href="/login">返回登录</Link>
          </Button>
        </FieldGroup>
      </form>
    </AuthFrame>
  );
}
