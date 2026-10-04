"use client";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
      <div className="notice">
        {step === 1 ? "1 / 2 · 地址与提货时间" : "2 / 2 · 货物与服务"} · 美国
        LTL · USD / lb / in
      </div>
      <ErrorNotice message={validation || operation.error} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 1) void next();
          else void submit(e);
        }}
      >
        <div style={{ display: step === 1 ? "block" : "none" }}>
          {(["origin", "destination"] as const).map((side, i) => (
            <section className="panel" key={side}>
              <div className="panel-header">
                <h2>{i === 0 ? "提货地址" : "收货地址"}</h2>
              </div>
              {saved.isPending ? (
                <p>正在加载地址簿…</p>
              ) : saved.error ? (
                <ErrorNotice message={saved.error.message} />
              ) : (
                <div className="form-field" style={{ marginBottom: 20 }}>
                  <label htmlFor={`${side}-saved`}>从地址簿选择</label>
                  <select
                    id={`${side}-saved`}
                    className="input"
                    defaultValue=""
                    onChange={(e) => {
                      const found = saved.data?.find(
                        (a) => a.id === e.target.value,
                      );
                      if (found) form.setValue(side, { ...found.data });
                    }}
                  >
                    <option value="">填写新地址</option>
                    {saved.data?.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.data.name} · {a.data.city}, {a.data.state}{" "}
                        {a.data.postalCode}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-grid">
                {addressFields.map((f) => (
                  <div
                    className={`form-field ${f.key === "street" ? "span-2" : ""}`}
                    key={f.key}
                  >
                    <label htmlFor={`${side}.${f.key}`}>{f.label} *</label>
                    <input
                      className="input"
                      id={`${side}.${f.key}`}
                      {...form.register(`${side}.${f.key}`)}
                      maxLength={f.key === "street" ? 2000 : 500}
                    />
                  </div>
                ))}
                <div className="form-field">
                  <label htmlFor={`${side}.type`}>地址类型</label>
                  <select
                    className="input"
                    id={`${side}.type`}
                    {...form.register(`${side}.type`)}
                  >
                    <option value="commercial">商业地址</option>
                    <option value="residential">住宅地址</option>
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor={`${side}.timezone`}>地址所在时区</label>
                  <select
                    className="input"
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
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>
          ))}
          <section className="panel">
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="pickupDate">提货日期（提货地当地日期） *</label>
                <input
                  className="input"
                  type="date"
                  id="pickupDate"
                  {...form.register("pickupDate")}
                />
              </div>
              <div className="form-field">
                <label htmlFor="reference">客户参考号</label>
                <input
                  className="input"
                  id="reference"
                  {...form.register("reference")}
                />
              </div>
            </div>
          </section>
        </div>
        <div style={{ display: step === 2 ? "block" : "none" }}>
          <section className="panel">
            <div className="panel-header">
              <h2>货物明细</h2>
              <span className="muted">重量 lb · 尺寸 in</span>
            </div>
            <div className="business-stack">
              {goods.fields.map((f, i) => (
                <div key={f.id}>
                  <div className="business-input-row">
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
                      <div className="form-field" key={k.key}>
                        <label htmlFor={`goods.${i}.${k.key}`}>
                          {k.label} *
                        </label>
                        <input
                          className="input"
                          id={`goods.${i}.${k.key}`}
                          type={k.key === "name" ? "text" : "number"}
                          step={k.key === "quantity" ? "1" : "0.001"}
                          min={k.key === "quantity" ? 1 : 0.001}
                          {...form.register(
                            `goods.${i}.${k.key}`,
                            k.key === "quantity" ? { valueAsNumber: true } : {},
                          )}
                        />
                      </div>
                    ))}
                  </div>
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
          </section>
          <section className="panel">
            <h2>附加服务与说明</h2>
            <div className="business-actions">
              {[
                { id: "liftgate", label: "尾板服务" },
                { id: "appointment", label: "预约送货" },
                { id: "inside", label: "室内交付" },
              ].map((s) => (
                <label className="business-check" key={s.id}>
                  <input
                    type="checkbox"
                    value={s.id}
                    {...form.register("services")}
                  />
                  {s.label}
                </label>
              ))}
            </div>
            <div className="form-field" style={{ marginTop: 20 }}>
              <label htmlFor="notes">补充说明</label>
              <textarea
                className="input"
                rows={4}
                id="notes"
                {...form.register("notes")}
                maxLength={2000}
              />
            </div>
            <p className="field-hint">
              本期仅接受非危险品运输。提交后询价将保存到系统，报价由运营人工确认。
            </p>
          </section>
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
      </form>
    </>
  );
}
