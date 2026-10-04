"use client";
import { BusinessSection } from "./shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Field as UiField,
  FieldLabel,
  FieldSet,
  FieldLegend,
  FieldGroup,
} from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  inquiryInput,
  addressInput,
  type InquiryInput,
  type AddressInput,
} from "@/modules/business/contracts";
import { useData, useOperation, api, Heading, ErrorNotice } from "./shared";
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
  { key: "name", label: "场所名称" },
  { key: "street", label: "完整街道地址" },
  { key: "city", label: "城市" },
  { key: "state", label: "州代码", placeholder: "CA" },
  { key: "postalCode", label: "邮编" },
  { key: "contact", label: "联系人" },
  { key: "phone", label: "联系电话" },
] as const;
export function InquiryForm() {
  const [step, setStep] = useState(1),
    [validation, setValidation] = useState(""),
    router = useRouter(),
    operation = useOperation(),
    saved = useData<Address[]>("addresses");
  const form = useForm<InquiryInput>({
    defaultValues: {
      origin: { ...blank },
      destination: { ...blank },
      pickupDate: "",
      mode: "LTL",
      goods: [
        {
          name: "",
          quantity: 1,
          weight: "",
          length: "",
          width: "",
          height: "",
        },
      ],
      services: [],
      dangerous: false,
      reference: "",
      notes: "",
    },
  });
  const goods = useFieldArray({ control: form.control, name: "goods" });
  async function next() {
    const d = form.getValues();
    const a = addressInput.safeParse(d.origin),
      b = addressInput.safeParse(d.destination);
    if (!a.success || !b.success || !/^\d{4}-\d{2}-\d{2}$/.test(d.pickupDate)) {
      setValidation(
        "请填写完整的提货、收货地址、两位大写州代码、邮编及提货日期。",
      );
      return;
    }
    setValidation("");
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const submit = form.handleSubmit(async (data) => {
    const result = inquiryInput.safeParse(data);
    if (!result.success) {
      setValidation(
        result.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("；"),
      );
      return;
    }
    const row = await operation.run(() =>
      api<{ id: string }>("inquiries", "POST", result.data),
    );
    if (row) router.push(`/portal/inquiries/${row.id}`);
  });
  return (
    <>
      <Heading
        title="创建询价"
        description="先确认运输地址，再填写货物信息。运营核实后向你发布报价。"
      />
      <Alert>
        <AlertDescription>
          {step === 1 ? "1 / 2 · 地址与提货时间" : "2 / 2 · 货物与服务"} · 美国
          LTL · USD / lb / in
        </AlertDescription>
      </Alert>
      <ErrorNotice message={validation || operation.error} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 1) void next();
          else void submit(e);
        }}
      >
        <FieldGroup>
          <div style={{ display: step === 1 ? "block" : "none" }}>
            {(["origin", "destination"] as const).map((side, i) => (
              <BusinessSection
                title={<>{i === 0 ? "提货地址" : "收货地址"}</>}
                key={side}
              >
                <div className="panel-header"></div>
                {saved.isPending ? (
                  <p>正在加载地址簿…</p>
                ) : saved.error ? (
                  <ErrorNotice message={saved.error.message} />
                ) : (
                  <UiField className="form-field" style={{ marginBottom: 20 }}>
                    <FieldLabel htmlFor={`${side}-saved`}>
                      从地址簿选择
                    </FieldLabel>
                    <NativeSelect
                      id={`${side}-saved`}

                      defaultValue=""
                      onChange={(e) => {
                        const found = saved.data?.find(
                          (a) => a.id === e.target.value,
                        );
                        if (found) form.setValue(side, { ...found.data });
                      }}
                    >
                      <NativeSelectOption value="">
                        填写新地址
                      </NativeSelectOption>
                      {saved.data?.map((a) => (
                        <NativeSelectOption key={a.id} value={a.id}>
                          {a.data.name} · {a.data.city}, {a.data.state}{" "}
                          {a.data.postalCode}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </UiField>
                )}
                <FieldGroup className="form-grid">
                  {addressFields.map((f) => (
                    <UiField
                      className={`form-field ${f.key === "street" ? "span-2" : ""}`}
                      key={f.key}
                    >
                      <FieldLabel htmlFor={`${side}.${f.key}`}>
                        {f.label} *
                      </FieldLabel>
                      <Input
                        id={`${side}.${f.key}`}
                        {...form.register(`${side}.${f.key}`)}
                        maxLength={f.key === "street" ? 2000 : 500}
                      />
                    </UiField>
                  ))}
                  <UiField className="form-field">
                    <FieldLabel htmlFor={`${side}.type`}>地址类型</FieldLabel>
                    <NativeSelect
                      id={`${side}.type`}
                      {...form.register(`${side}.type`)}
                    >
                      <NativeSelectOption value="commercial">
                        商业地址
                      </NativeSelectOption>
                      <NativeSelectOption value="residential">
                        住宅地址
                      </NativeSelectOption>
                    </NativeSelect>
                  </UiField>
                  <UiField className="form-field">
                    <FieldLabel htmlFor={`${side}.timezone`}>
                      地址所在时区
                    </FieldLabel>
                    <NativeSelect
                      id={`${side}.timezone`}
                      {...form.register(`${side}.timezone`)}
                    >
                      {[
                        "America/Los_Angeles",
                        "America/Denver",
                        "America/Chicago",
                        "America/New_York",
                        "America/Phoenix",
                        "America/Anchorage",
                        "Pacific/Honolulu",
                      ].map((t) => (
                        <NativeSelectOption key={t}>{t}</NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </UiField>
                </FieldGroup>
              </BusinessSection>
            ))}
            <BusinessSection title={<>运输资料</>}>
              <FieldGroup className="form-grid">
                <UiField className="form-field">
                  <FieldLabel htmlFor="pickupDate">
                    提货日期（提货地当地日期） *
                  </FieldLabel>
                  <Input
                    type="date"
                    id="pickupDate"
                    {...form.register("pickupDate")}
                  />
                </UiField>
                <UiField className="form-field">
                  <FieldLabel htmlFor="reference">客户参考号</FieldLabel>
                  <Input id="reference" {...form.register("reference")} />
                </UiField>
              </FieldGroup>
            </BusinessSection>
          </div>
          <div style={{ display: step === 2 ? "block" : "none" }}>
            <BusinessSection title={<>货物明细</>}>
              <div className="panel-header">
                <span className="muted">重量 lb · 尺寸 in</span>
              </div>
              <div className="business-stack">
                {goods.fields.map((f, i) => (
                  <div key={f.id}>
                    <FieldGroup className="business-input-row">
                      {(
                        [
                          { key: "name", label: "货物名称" },
                          { key: "quantity", label: "件数" },
                          { key: "weight", label: "单件重量 lb" },
                          { key: "length", label: "长 in" },
                          { key: "width", label: "宽 in" },
                          { key: "height", label: "高 in" },
                        ] as const
                      ).map((k) => (
                        <UiField className="form-field" key={k.key}>
                          <FieldLabel htmlFor={`goods.${i}.${k.key}`}>
                            {k.label} *
                          </FieldLabel>
                          <Input
                            id={`goods.${i}.${k.key}`}
                            type={k.key === "name" ? "text" : "number"}
                            step={k.key === "quantity" ? "1" : "0.001"}
                            min={k.key === "quantity" ? 1 : 0.001}
                            {...form.register(
                              `goods.${i}.${k.key}`,
                              k.key === "quantity"
                                ? { valueAsNumber: true }
                                : {},
                            )}
                          />
                        </UiField>
                      ))}
                    </FieldGroup>
                    {goods.fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => goods.remove(i)}
                      >
                        移除第 {i + 1} 行
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  type="button"
                  disabled={goods.fields.length >= 30}
                  onClick={() =>
                    goods.append({
                      name: "",
                      quantity: 1,
                      weight: "",
                      length: "",
                      width: "",
                      height: "",
                    })
                  }
                >
                  添加货物行
                </Button>
              </div>
            </BusinessSection>
            <BusinessSection title={<>附加服务与说明</>}>
              <FieldSet>
                <FieldLegend className="sr-only">附加服务</FieldLegend>
                <Controller
                  control={form.control}
                  name="services"
                  render={({ field }) => (
                    <FieldGroup className="flex-row flex-wrap gap-4">
                      {(
                        [
                          { id: "liftgate", label: "尾板服务" },
                          { id: "appointment", label: "预约送货" },
                          { id: "inside", label: "室内交付" },
                        ] as const
                      ).map((s) => (
                        <UiField
                          orientation="horizontal"
                          key={s.id}
                          className="w-auto"
                        >
                          <Checkbox
                            id={`service-${s.id}`}
                            checked={field.value.includes(s.id)}
                            onBlur={field.onBlur}
                            onCheckedChange={(checked) =>
                              field.onChange(
                                checked === true
                                  ? [...field.value, s.id]
                                  : field.value.filter((v) => v !== s.id),
                              )
                            }
                          />
                          <FieldLabel htmlFor={`service-${s.id}`}>
                            {s.label}
                          </FieldLabel>
                        </UiField>
                      ))}
                    </FieldGroup>
                  )}
                />
              </FieldSet>
              <UiField className="form-field" style={{ marginTop: 20 }}>
                <FieldLabel htmlFor="notes">补充说明</FieldLabel>
                <Textarea
                  rows={4}
                  id="notes"
                  {...form.register("notes")}
                  maxLength={2000}
                />
              </UiField>
              <p className="field-hint">
                本期仅接受非危险品运输。提交后询价将保存到系统，报价由运营人工确认。
              </p>
            </BusinessSection>
          </div>
          <div className="business-actions">
            {step === 2 && (
              <Button
                variant="outline"
                type="button"
                disabled={operation.busy}
                onClick={() => {
                  setStep(1);
                  setValidation("");
                }}
              >
                上一步
              </Button>
            )}
            <Button disabled={operation.busy}>
              {operation.busy
                ? "正在保存…"
                : step === 1
                  ? "下一步：货物与服务"
                  : "提交询价"}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </>
  );
}
