"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { onboardingInput } from "@/modules/business/auth-contracts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { AuthFrame } from "./AuthFrame";
import { api, ErrorNotice } from "./shared";
type Values = { companyName: string; contact: string; phone: string };
export function OnboardingForm({ email }: { email: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(onboardingInput) });
  return (
    <AuthFrame
      title="完善客户资料"
      description={`邮箱 ${email} 已验证。填写联系信息后，开始第一次询价。`}
    >
      <form
        onSubmit={handleSubmit(async (values) => {
          setError("");
          try {
            const r = await api<{ destination: string }>(
              "auth/onboarding",
              "POST",
              values,
            );
            router.replace(r.destination);
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          }
        })}
      >
        <FieldGroup>
          <ErrorNotice message={error} />
          {(
            [
              {
                name: "companyName",
                label: "公司或业务名称",
                autoComplete: "organization",
              },
              { name: "contact", label: "联系人", autoComplete: "name" },
              { name: "phone", label: "联系电话", autoComplete: "tel" },
            ] as const
          ).map((f) => (
            <Field key={f.name} data-invalid={!!errors[f.name]}>
              <FieldLabel htmlFor={f.name}>{f.label}</FieldLabel>
              <Input
                id={f.name}
                autoComplete={f.autoComplete}
                type={f.name === "phone" ? "tel" : "text"}
                aria-invalid={!!errors[f.name]}
                {...register(f.name)}
              />
              {errors[f.name] && (
                <FieldError>{errors[f.name]?.message}</FieldError>
              )}
            </Field>
          ))}
          <Button disabled={isSubmitting}>
            {isSubmitting ? "正在建立资料…" : "保存并开始询价"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={async () => {
              try {
                await api("auth/logout", "POST");
                router.replace("/login");
                router.refresh();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            退出登录
          </Button>
        </FieldGroup>
      </form>
    </AuthFrame>
  );
}
