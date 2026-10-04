// These mutable library APIs intentionally run without React Compiler memoization.
/* eslint-disable react-hooks/incompatible-library */
"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  MapPin,
  Package,
  Save,
} from "lucide-react";
import { usePrototype } from "../provider";
import { inquirySchema } from "../validation";
import { type InquiryDraft, services } from "../model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/prototype/FormField";
import { PageHeading, Summary } from "@/components/prototype/shared";
export function Inquiry() {
  const { state, updateDraft, scenario } = usePrototype();
  const router = useRouter();
  const params = useSearchParams();
  const step = params.get("step") === "cargo" ? 2 : 1;
  const [saved, setSaved] = useState(false);
  const form = useForm<InquiryDraft>({
    resolver: zodResolver(inquirySchema),
    defaultValues: state.draft,
    mode: "onBlur",
  });
  const {
    register,
    control,
    formState: { errors },
    trigger,
    handleSubmit,
    watch,
    getValues,
  } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "goods" });
  const draft = watch();
  useEffect(() => {
    const subscription = watch((value) => {
      updateDraft(value as InquiryDraft);
      setSaved(false);
    });
    return () => subscription.unsubscribe();
  }, [watch, updateDraft]);
  async function next() {
    const valid = await trigger(["origin", "destination", "date"], {
      shouldFocus: true,
    });
    if (valid) router.push("/prototype/portal/inquiry?step=cargo");
  }
  function quotes() {
    router.push("/prototype/portal/quotes?request=1");
  }
  return (
    <>
      <PageHeading
        title="为下一程，找到合适运力"
        description="填写运输信息，比较承运商报价，再确认下单。"
        action={
          <Button
            variant="outline"
            onClick={() => {
              updateDraft(getValues());
              setSaved(true);
            }}
          >
            <Save size={16} />
            {saved ? "草稿已保存" : "保存草稿"}
          </Button>
        }
      />
      <div className="steps" aria-label="询价步骤">
        {["收发货信息", "货物与服务", "比较报价", "确认下单"].map(
          (label, i) => (
            <div
              key={label}
              className={
                i + 1 === step ? "active" : i + 1 < step ? "complete" : ""
              }
            >
              <span>
                {i + 1 < step ? (
                  <Check size={14} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              {label}
              {i < 3 && <i />}
            </div>
          ),
        )}
      </div>
      <div className="split-layout">
        <form onSubmit={handleSubmit(quotes)} noValidate>
          <div className="autosave" role="status">
            <span className="status-dot" />
            输入自动保存为本机草稿，返回或刷新不会丢失。
          </div>
          {step === 1 ? (
            <>
              <section className="panel">
                <div className="panel-header">
                  <h2>
                    <MapPin size={17} />
                    提货信息
                  </h2>
                  <span className="section-number">01</span>
                </div>
                <div className="form-grid">
                  <FormField
                    label="提货仓库 / 名称"
                    required
                    error={errors.origin?.name?.message}
                  >
                    <Input {...register("origin.name")} autoComplete="off" />
                  </FormField>
                  <FormField label="运输方式">
                    <select className="field" {...register("mode")}>
                      <option value="LTL">LTL · 零担卡派</option>
                      <option value="FTL">FTL · 整车（待确认）</option>
                      <option value="PTL">PTL · 部分整车（待确认）</option>
                    </select>
                  </FormField>
                  <FormField
                    label="提货联系人及电话"
                    required
                    error={errors.origin?.contact?.message}
                  >
                    <Input {...register("origin.contact")} />
                  </FormField>
                  <FormField
                    label="计划提货日期"
                    required
                    error={errors.date?.message}
                    hint="当地日期 · America/Los_Angeles"
                  >
                    <Input type="date" {...register("date")} />
                  </FormField>
                  <div className="span-2">
                    <FormField
                      label="完整提货地址"
                      required
                      error={errors.origin?.address?.message}
                    >
                      <textarea {...register("origin.address")} />
                    </FormField>
                  </div>
                </div>
              </section>
              <section className="panel">
                <div className="panel-header">
                  <h2>
                    <MapPin size={17} />
                    收货信息
                  </h2>
                  <span className="section-number">02</span>
                </div>
                <div className="form-grid">
                  <FormField
                    label="收货公司 / 姓名"
                    required
                    error={errors.destination?.name?.message}
                  >
                    <Input {...register("destination.name")} />
                  </FormField>
                  <FormField label="收货地址类型">
                    <select className="field" {...register("destination.type")}>
                      <option value="commercial">商业地址</option>
                      <option value="residential">住宅地址</option>
                    </select>
                  </FormField>
                  <div className="span-2">
                    <FormField
                      label="完整收货地址"
                      required
                      error={errors.destination?.address?.message}
                      hint="包含街道、门牌、城市、州和邮编"
                    >
                      <textarea
                        {...register("destination.address")}
                        placeholder="请输入完整收货地址"
                      />
                    </FormField>
                  </div>
                  <FormField
                    label="收货联系人及电话"
                    required
                    error={errors.destination?.contact?.message}
                  >
                    <Input {...register("destination.contact")} />
                  </FormField>
                  <FormField label="客户参考号" hint="用于匹配你的业务订单">
                    <Input {...register("reference")} />
                  </FormField>
                </div>
              </section>
              {scenario === "long" && (
                <div className="notice">
                  长地址评审示例：Building 12, Receiving Dock B, 2200
                  International Logistics and Distribution Boulevard, Dallas,
                  Texas 75201, United States。可填入地址测试完整展示。
                </div>
              )}
              <div className="form-actions">
                <p className="small muted">客户：{draft.customer}</p>
                <Button type="button" onClick={next}>
                  下一步：填写货物
                  <ArrowRight size={16} />
                </Button>
              </div>
            </>
          ) : (
            <>
              <section className="panel">
                <div className="panel-header">
                  <h2>
                    <Package size={17} />
                    货物明细
                  </h2>
                  <span className="small muted">重量单位 lb · 货值 USD</span>
                </div>
                {fields.map((field, i) => (
                  <fieldset className="goods-item" key={field.id}>
                    <legend>货物 {String(i + 1).padStart(2, "0")}</legend>
                    <div className="goods-title">
                      <span>每行填写一种货物</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={fields.length === 1}
                        onClick={() => remove(i)}
                        aria-label={`删除货物 ${i + 1}`}
                      >
                        <Trash2 size={15} />
                        删除
                      </Button>
                    </div>
                    <div className="form-grid">
                      <FormField
                        label={`品名 ${i + 1}`}
                        required
                        error={errors.goods?.[i]?.name?.message}
                      >
                        <Input {...register(`goods.${i}.name`)} />
                      </FormField>
                      <FormField label={`SKU ${i + 1}`}>
                        <Input {...register(`goods.${i}.sku`)} />
                      </FormField>
                      <FormField
                        label={`件数 ${i + 1}`}
                        required
                        error={errors.goods?.[i]?.quantity?.message}
                      >
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          {...register(`goods.${i}.quantity`, {
                            valueAsNumber: true,
                          })}
                        />
                      </FormField>
                      <FormField
                        label={`总重量 ${i + 1} (lb)`}
                        required
                        error={errors.goods?.[i]?.weight?.message}
                      >
                        <Input
                          type="number"
                          min="0.01"
                          step="any"
                          {...register(`goods.${i}.weight`, {
                            valueAsNumber: true,
                          })}
                        />
                      </FormField>
                      <FormField label={`HS 编码 ${i + 1}`}>
                        <Input {...register(`goods.${i}.hs`)} />
                      </FormField>
                      <FormField
                        label={`申报货值 ${i + 1} (USD)`}
                        error={errors.goods?.[i]?.value?.message}
                      >
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          {...register(`goods.${i}.value`, {
                            valueAsNumber: true,
                          })}
                        />
                      </FormField>
                    </div>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        {...register(`goods.${i}.dangerous`)}
                      />
                      含危险品（需另行确认承运能力）
                    </label>
                  </fieldset>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    append({
                      id: crypto.randomUUID(),
                      name: "",
                      sku: "",
                      hs: "",
                      quantity: 1,
                      weight: 1,
                      value: 0,
                      dangerous: false,
                    })
                  }
                >
                  <Plus size={16} />
                  添加一种货物
                </Button>
              </section>
              <section className="panel">
                <div className="panel-header">
                  <h2>包装与尺寸</h2>
                  <span className="small muted">尺寸单位 in</span>
                </div>
                <div className="form-grid">
                  <FormField label="包装方式">
                    <select className="field" {...register("packaging")}>
                      <option value="own">自备托盘</option>
                      <option value="warehouse">仓库打托</option>
                      <option value="carton">纸箱</option>
                    </select>
                  </FormField>
                  {(
                    [
                      "pallets",
                      "length",
                      "width",
                      "height",
                      "palletWeight",
                    ] as const
                  ).map((key, i) => (
                    <FormField
                      key={key}
                      label={
                        [
                          "托盘数量",
                          "长 (in)",
                          "宽 (in)",
                          "高 (in)",
                          "包装总重量 (lb)",
                        ][i]
                      }
                      error={errors[key]?.message}
                    >
                      <Input
                        type="number"
                        step="any"
                        {...register(key, { valueAsNumber: true })}
                      />
                    </FormField>
                  ))}
                </div>
              </section>
              <section className="panel">
                <div className="panel-header">
                  <h2>附加服务</h2>
                  <span className="small muted">费用以报价结果为准</span>
                </div>
                <div className="service-grid">
                  {services.map((s) => (
                    <label
                      key={s.id}
                      className={`service-option ${draft.services.includes(s.id) ? "selected" : ""}`}
                    >
                      <input
                        type="checkbox"
                        value={s.id}
                        {...register("services")}
                      />
                      <span>
                        <strong>{s.name}</strong>
                        <small>{s.description}</small>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="notes-field">
                  <FormField label="运输备注">
                    <textarea
                      {...register("notes")}
                      placeholder="例如：收货月台开放时间、装卸注意事项"
                    />
                  </FormField>
                </div>
              </section>
              {(draft.mode !== "LTL" ||
                draft.goods.some((g) => g.dangerous)) && (
                <div className="notice warning">
                  此运输方式或危险品承运范围尚待确认，本轮不提供示例报价。
                </div>
              )}
              <div className="form-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/prototype/portal/inquiry")}
                >
                  <ArrowLeft size={16} />
                  返回收发货
                </Button>
                <Button
                  type="submit"
                  disabled={
                    draft.mode !== "LTL" || draft.goods.some((g) => g.dangerous)
                  }
                >
                  获取承运商报价
                  <ArrowRight size={16} />
                </Button>
              </div>
            </>
          )}
        </form>
        <Summary draft={draft} />
      </div>
    </>
  );
}
