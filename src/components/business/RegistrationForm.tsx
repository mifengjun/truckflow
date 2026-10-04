"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registrationInput } from "@/modules/business/auth-contracts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthFrame } from "./AuthFrame";
import { api, ErrorNotice } from "./shared";
type Values = { email: string };
export function RegistrationForm({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(registrationInput),
    defaultValues: { email: "" },
  });
  return (
    <AuthFrame
      title="注册客户账号"
      description="先验证邮箱，再设置密码和填写客户资料。询价无需充值。"
    >
      <form
        onSubmit={handleSubmit(async (values) => {
          setError("");
          try {
            await api("auth/register", "POST", values);
            router.replace("/auth/verify");
          } catch (e) {
            setError((e as Error).message);
          }
        })}
      >
        <FieldGroup>
          {!enabled && (
            <Alert>
              <AlertDescription>
                邮件服务待配置，自主注册暂未开放。你可以查看注册流程，已有账号可继续登录。
              </AlertDescription>
            </Alert>
          )}
          <ErrorNotice message={error} />
          {(
            [
              {
                name: "email",
                label: "邮箱",
                type: "email",
                autoComplete: "email",
              },
            ] as const
          ).map((f) => (
            <Field key={f.name} data-invalid={!!errors[f.name]}>
              <FieldLabel htmlFor={f.name}>{f.label}</FieldLabel>
              <Input
                id={f.name}
                type={f.type}
                autoComplete={f.autoComplete}
                aria-invalid={!!errors[f.name]}
                aria-describedby={
                  errors[f.name] ? `${f.name}-error` : undefined
                }
                {...register(f.name)}
              />
              {errors[f.name] && (
                <FieldError id={`${f.name}-error`}>
                  {errors[f.name]?.message}
                </FieldError>
              )}
            </Field>
          ))}
          <p className="text-sm text-muted-foreground">
            验证邮件发送后，请点击邮件中的链接继续注册。已有客户的同事账号请通过管理员邀请加入。
          </p>
          <Button disabled={!enabled || isSubmitting}>
            {isSubmitting ? "正在提交…" : "发送验证邮件"}
          </Button>
          <Button variant="link" asChild>
            <Link href="/login">已有账号登录</Link>
          </Button>
        </FieldGroup>
      </form>
    </AuthFrame>
  );
}
