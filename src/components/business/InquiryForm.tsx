"use client";

import { z } from "zod";
import Decimal from "decimal.js";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import {
  useForm,
  useFieldArray,
  Controller,
  useWatch,
  type FieldPath,
} from "react-hook-form";
import { useRouter } from "next/navigation";
import { Check, ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field as UiField,
  FieldLabel,
  FieldSet,
  FieldLegend,
  FieldGroup,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupText,
} from "@/components/ui/input-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  inquiryInput,
  type InquiryInput,
  type AddressInput,
} from "@/modules/business/contracts";
import {
  BusinessSection,
  useData,
  useOperation,
  api,
  Heading,
  ErrorNotice,
} from "./shared";
import { AddressPicker } from "./AddressPicker";
import type { Address } from "./types";

const blank: AddressInput = {
  name: "",
  street: "",
  city: "",
  state: "",
  postalCode: "",
  contact: "",
  phone: "",
  type: "commercial",
  timezone: "America/Los_Angeles",
};
export const addressFields = [
  { key: "name", label: "场所名称", placeholder: "仓库或公司名称" },
  { key: "street", label: "完整街道地址", placeholder: "门牌号、街道及单元号" },
  { key: "city", label: "城市", placeholder: "例如 Los Angeles" },
  { key: "state", label: "州代码", placeholder: "例如 CA" },
  { key: "postalCode", label: "邮编", placeholder: "例如 90001" },
  { key: "contact", label: "联系人", placeholder: "现场联系人姓名" },
  { key: "phone", label: "联系电话", placeholder: "含区号，可填写分机" },
] as const;
const timezones = [
  ["America/Los_Angeles", "太平洋时间 · 洛杉矶"],
  ["America/Denver", "山地时间 · 丹佛"],
  ["America/Chicago", "中部时间 · 芝加哥"],
  ["America/New_York", "东部时间 · 纽约"],
  ["America/Phoenix", "亚利桑那时间 · 凤凰城"],
  ["America/Anchorage", "阿拉斯加时间"],
  ["Pacific/Honolulu", "夏威夷时间"],
] as const;
const emptyGoods = {
  name: "",
  quantity: 1,
  weight: "",
  length: "",
  width: "",
  height: "",
};
type FormValues = z.input<typeof inquiryInput>;
const firstStepFields: FieldPath<FormValues>[] = [
  ...(["origin", "destination"] as const).flatMap((side) => [
    ...addressFields.map((field) => `${side}.${field.key}` as const),
    `${side}.type` as const,
    `${side}.timezone` as const,
  ]),
  "pickupDate",
  "reference",
];

export function InquiryForm() {
  const [step, setStep] = useState(1);
  const router = useRouter(),
    operation = useOperation(),
    saved = useData<Address[]>("addresses");
  const form = useForm<FormValues, unknown, InquiryInput>({
    resolver: zodResolver(inquiryInput),
    defaultValues: {
      origin: { ...blank },
      destination: { ...blank },
      pickupDate: "",
      mode: "LTL",
      goods: [{ ...emptyGoods }],
      services: [],
      dangerous: false,
      reference: "",
      notes: "",
    },
  });
  const goods = useFieldArray({ control: form.control, name: "goods" });
  const watchedGoods = useWatch({ control: form.control, name: "goods" });
  const summary = watchedGoods.reduce(
    (total, item) => {
      const quantity = Number(item.quantity),
        weight = Number(item.weight);
      if (Number.isInteger(quantity) && quantity > 0 && quantity <= 1000000) {
        total.quantity += quantity;
        if (
          /^\d+(\.\d{1,3})?$/.test(item.weight) &&
          weight > 0 &&
          weight <= 1000000
        )
          total.weight = total.weight.plus(
            new Decimal(item.weight).times(quantity),
          );
        else total.complete = false;
      } else total.complete = false;
      return total;
    },
    { quantity: 0, weight: new Decimal(0), complete: true },
  );
  const errorProps = (name: FieldPath<FormValues>) => {
    const error = form.getFieldState(name, form.formState).error;
    return {
      "aria-invalid": !!error,
      "aria-describedby": error ? `${name}-error` : undefined,
    };
  };
  function errorFor(name: FieldPath<FormValues>) {
    const error = form.getFieldState(name, form.formState).error;
    return <FieldError id={`${name}-error`} errors={[error]} />;
  }
  async function next() {
    if (await form.trigger(firstStepFields, { shouldFocus: true })) {
      const data = form.getValues();
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: data.origin.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      if (data.pickupDate < today) {
        form.setError(
          "pickupDate",
          { message: "提货日期不能早于提货地今天" },
          { shouldFocus: true },
        );
        return;
      }
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
  const submit = form.handleSubmit(
    async (data) => {
      const row = await operation.run(() =>
        api<{ id: string }>("inquiries", "POST", data),
      );
      if (row) router.push(`/portal/inquiries/${row.id}`);
    },
    (errors) => {
      if (
        errors.origin ||
        errors.destination ||
        errors.pickupDate ||
        errors.reference
      ) {
        setStep(1);
        requestAnimationFrame(() => {
          const first = firstStepFields.find(
            (name) => form.getFieldState(name).error,
          );
          form.setFocus(
            first ?? (errors.pickupDate ? "pickupDate" : "reference"),
          );
        });
      }
    },
  );
  return (
    <>
      <Heading
        title="创建询价"
        description="确认运输地址和货物信息，提交后由运营核实并发布承运方案。"
      />
      <div className="flex flex-col gap-3" aria-label="询价填写进度">
        <ol className="grid grid-cols-2 gap-4">
          {["地址与提货时间", "货物与服务"].map((label, index) => (
            <li
              key={label}
              aria-current={step === index + 1 ? "step" : undefined}
              className="flex items-center gap-3"
            >
              <Badge variant={step >= index + 1 ? "default" : "secondary"}>
                {step > index + 1 ? <Check aria-label="已完成" /> : index + 1}
              </Badge>
              <span
                className={cn(
                  "text-sm",
                  step < index + 1 && "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </li>
          ))}
        </ol>
        <Progress value={step === 1 ? 0 : 50} aria-label="填写进度" />
      </div>
      <ErrorNotice message={operation.error} />
      <form
        noValidate
        onSubmit={(event) => {
          if (step === 1) {
            event.preventDefault();
            void next();
          } else void submit(event);
        }}
      >
        <FieldGroup>
          <div hidden={step !== 1}>
            <div className="flex flex-col gap-6">
              <div className="grid items-start gap-6 xl:grid-cols-2">
                {(["origin", "destination"] as const).map((side, index) => (
                  <BusinessSection
                    key={side}
                    title={index === 0 ? "提货地址" : "收货地址"}
                    description="带 * 的字段为必填项。选择已保存地址后仍可修改。"
                  >
                    <FieldGroup>
                      <UiField>
                        <FieldLabel htmlFor={`${side}-saved`}>
                          从地址簿填入
                        </FieldLabel>
                        {saved.isPending ? (
                          <p className="text-sm text-muted-foreground">
                            正在加载地址簿…
                          </p>
                        ) : saved.error ? (
                          <>
                            <ErrorNotice message="地址簿加载失败，可直接填写地址。" />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void saved.refetch()}
                            >
                              重试加载
                            </Button>
                          </>
                        ) : saved.data?.length ? (
                          <AddressPicker
                            id={`${side}-saved`}
                            addresses={saved.data}
                            onSelect={(address) => {
                              form.setValue(
                                side,
                                { ...address.data },
                                { shouldDirty: true },
                              );
                              form.clearErrors(side);
                            }}
                          />
                        ) : (
                          <FieldDescription>
                            暂无保存的地址，请在下方填写。
                          </FieldDescription>
                        )}
                      </UiField>
                      <Separator />
                      <FieldGroup className="grid gap-5 sm:grid-cols-2">
                        {addressFields.map((field) => {
                          const name = `${side}.${field.key}` as const;
                          return (
                            <UiField
                              key={field.key}
                              className={cn(
                                (field.key === "street" ||
                                  field.key === "name") &&
                                  "sm:col-span-2",
                              )}
                              data-invalid={
                                !!form.getFieldState(name, form.formState).error
                              }
                            >
                              <FieldLabel htmlFor={name}>
                                {field.label} *
                              </FieldLabel>
                              <Input
                                id={name}
                                placeholder={field.placeholder}
                                type={field.key === "phone" ? "tel" : "text"}
                                maxLength={
                                  field.key === "street"
                                    ? 2000
                                    : field.key === "state"
                                      ? 2
                                      : field.key === "postalCode"
                                        ? 10
                                        : 500
                                }
                                {...form.register(
                                  name,
                                  field.key === "state"
                                    ? {
                                        setValueAs: (value: string) =>
                                          value.trim().toUpperCase(),
                                      }
                                    : {},
                                )}
                                {...errorProps(name)}
                              />
                              {errorFor(name)}
                            </UiField>
                          );
                        })}
                        <UiField
                          data-invalid={!!form.formState.errors[side]?.type}
                        >
                          <FieldLabel htmlFor={`${side}.type`}>
                            地址类型
                          </FieldLabel>
                          <NativeSelect
                            id={`${side}.type`}
                            {...form.register(`${side}.type`)}
                            {...errorProps(`${side}.type`)}
                          >
                            <NativeSelectOption value="commercial">
                              商业地址
                            </NativeSelectOption>
                            <NativeSelectOption value="residential">
                              住宅地址
                            </NativeSelectOption>
                          </NativeSelect>
                          {errorFor(`${side}.type`)}
                        </UiField>
                        <UiField
                          data-invalid={!!form.formState.errors[side]?.timezone}
                        >
                          <FieldLabel htmlFor={`${side}.timezone`}>
                            地址所在时区
                          </FieldLabel>
                          <NativeSelect
                            id={`${side}.timezone`}
                            {...form.register(`${side}.timezone`)}
                            {...errorProps(`${side}.timezone`)}
                          >
                            {timezones.map(([value, label]) => (
                              <NativeSelectOption value={value} key={value}>
                                {label}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                          {errorFor(`${side}.timezone`)}
                        </UiField>
                      </FieldGroup>
                    </FieldGroup>
                  </BusinessSection>
                ))}
              </div>
              <BusinessSection
                title="提货安排"
                description="提货日期按提货地的当地日期填写。"
              >
                <FieldGroup className="grid gap-5 sm:grid-cols-2">
                  <UiField data-invalid={!!form.formState.errors.pickupDate}>
                    <FieldLabel htmlFor="pickupDate">提货日期 *</FieldLabel>
                    <Input
                      type="date"
                      id="pickupDate"
                      {...form.register("pickupDate")}
                      {...errorProps("pickupDate")}
                    />
                    {errorFor("pickupDate")}
                  </UiField>
                  <UiField data-invalid={!!form.formState.errors.reference}>
                    <FieldLabel htmlFor="reference">
                      客户参考号（选填）
                    </FieldLabel>
                    <Input
                      id="reference"
                      placeholder="方便与你的内部记录对应"
                      maxLength={100}
                      {...form.register("reference")}
                      {...errorProps("reference")}
                    />
                    {errorFor("reference")}
                  </UiField>
                </FieldGroup>
              </BusinessSection>
            </div>
          </div>
          <div hidden={step !== 2}>
            <div className="flex flex-col gap-6">
              <BusinessSection
                title="货物明细"
                description="按相同规格分组填写。重量为单件重量，尺寸为单件外包装尺寸。"
              >
                <FieldGroup>
                  {goods.fields.map((item, index) => (
                    <FieldSet key={item.id}>
                      <FieldLegend className="flex w-full items-center justify-between gap-3">
                        <span>货物 {index + 1}</span>
                        {goods.fields.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            aria-label={`移除货物 ${index + 1}`}
                            onClick={() => goods.remove(index)}
                          >
                            <Trash2 data-icon="inline-start" />
                            移除
                          </Button>
                        )}
                      </FieldLegend>
                      <FieldGroup className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {(
                          [
                            { key: "name", label: "货物名称", unit: "" },
                            { key: "quantity", label: "件数", unit: "件" },
                            { key: "weight", label: "单件重量", unit: "lb" },
                            { key: "length", label: "长", unit: "in" },
                            { key: "width", label: "宽", unit: "in" },
                            { key: "height", label: "高", unit: "in" },
                          ] as const
                        ).map((field) => {
                          const name = `goods.${index}.${field.key}` as const;
                          const registration = form.register(
                            name,
                            field.key === "quantity"
                              ? { valueAsNumber: true }
                              : {},
                          );
                          return (
                            <UiField
                              key={field.key}
                              data-invalid={
                                !!form.getFieldState(name, form.formState).error
                              }
                            >
                              <FieldLabel htmlFor={name}>
                                {field.label} *
                              </FieldLabel>
                              {field.unit ? (
                                <InputGroup>
                                  <InputGroupInput
                                    id={name}
                                    type="number"
                                    step={
                                      field.key === "quantity" ? "1" : "0.001"
                                    }
                                    min={field.key === "quantity" ? 1 : 0.001}
                                    max={1000000}
                                    placeholder={
                                      field.key === "quantity" ? "1" : "0"
                                    }
                                    {...registration}
                                    {...errorProps(name)}
                                  />
                                  <InputGroupAddon align="inline-end">
                                    <InputGroupText>
                                      {field.unit}
                                    </InputGroupText>
                                  </InputGroupAddon>
                                </InputGroup>
                              ) : (
                                <Input
                                  id={name}
                                  placeholder="例如 General merchandise"
                                  maxLength={500}
                                  {...registration}
                                  {...errorProps(name)}
                                />
                              )}
                              {errorFor(name)}
                            </UiField>
                          );
                        })}
                      </FieldGroup>
                      {index < goods.fields.length - 1 && <Separator />}
                    </FieldSet>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="self-start"
                    disabled={goods.fields.length >= 30}
                    onClick={() =>
                      goods.append(
                        { ...emptyGoods },
                        { focusName: `goods.${goods.fields.length}.name` },
                      )
                    }
                  >
                    <Plus data-icon="inline-start" />
                    添加货物
                  </Button>
                  <Separator />
                  <dl
                    className="flex flex-wrap gap-x-10 gap-y-3"
                    aria-live="polite"
                  >
                    <div>
                      <dt className="text-sm text-muted-foreground">
                        货物组数 / 件数
                      </dt>
                      <dd>
                        {goods.fields.length} 组 ·{" "}
                        {summary.quantity.toLocaleString("zh-CN")} 件
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-foreground">
                        总重量{!summary.complete && "（待填写完整）"}
                      </dt>
                      <dd>
                        {summary.weight.toNumber().toLocaleString("zh-CN", {
                          maximumFractionDigits: 3,
                        })}{" "}
                        lb
                      </dd>
                    </div>
                  </dl>
                </FieldGroup>
              </BusinessSection>
              <BusinessSection
                title="附加服务与说明"
                description="本期仅接受非危险品运输。服务需求将由运营核实。"
              >
                <FieldGroup>
                  <FieldSet>
                    <FieldLegend>附加服务（选填）</FieldLegend>
                    <Controller
                      control={form.control}
                      name="services"
                      render={({ field }) => (
                        <FieldGroup className="flex-row flex-wrap gap-6">
                          {(
                            [
                              { id: "liftgate", label: "尾板服务" },
                              { id: "appointment", label: "预约送货" },
                              { id: "inside", label: "室内交付" },
                            ] as const
                          ).map((service) => (
                            <UiField
                              orientation="horizontal"
                              key={service.id}
                              className="w-auto"
                            >
                              <Checkbox
                                id={`service-${service.id}`}
                                checked={field.value.includes(service.id)}
                                onBlur={field.onBlur}
                                onCheckedChange={(checked) =>
                                  field.onChange(
                                    checked === true
                                      ? [...field.value, service.id]
                                      : field.value.filter(
                                          (value) => value !== service.id,
                                        ),
                                  )
                                }
                              />
                              <FieldLabel htmlFor={`service-${service.id}`}>
                                {service.label}
                              </FieldLabel>
                            </UiField>
                          ))}
                        </FieldGroup>
                      )}
                    />
                  </FieldSet>
                  <UiField data-invalid={!!form.formState.errors.notes}>
                    <FieldLabel htmlFor="notes">补充说明（选填）</FieldLabel>
                    <Textarea
                      id="notes"
                      rows={4}
                      maxLength={2000}
                      placeholder="例如装卸限制、预约要求或其他运输注意事项"
                      {...form.register("notes")}
                      {...errorProps("notes")}
                    />
                    {errorFor("notes")}
                  </UiField>
                </FieldGroup>
              </BusinessSection>
            </div>
          </div>
          <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t bg-background py-4">
            <p className="text-sm text-muted-foreground">
              {step === 1
                ? "下一步填写货物与附加服务"
                : "提交后可在询价详情中跟进报价"}
            </p>
            <div className="flex gap-3">
              {step === 2 && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={operation.busy}
                  onClick={() => {
                    setStep(1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <ArrowLeft data-icon="inline-start" />
                  上一步
                </Button>
              )}
              <Button disabled={operation.busy || form.formState.isSubmitting}>
                {operation.busy && <Spinner data-icon="inline-start" />}
                {operation.busy
                  ? "正在保存…"
                  : step === 1
                    ? "下一步"
                    : "提交询价"}
                {step === 1 && <ArrowRight data-icon="inline-end" />}
              </Button>
            </div>
          </div>
        </FieldGroup>
      </form>
    </>
  );
}
