"use client";
import { useId, useRef, useState, type RefObject } from "react";
import {
  BusinessSection,
  useData,
  useOperation,
  api,
  Heading,
  Loading,
  Table,
  Empty,
  ErrorNotice,
  Field,
} from "./shared";
import { OperationPanel } from "./OperationPanel";
import { TableRow, TableCell } from "@/components/ui/table";
import {
  Field as UiField,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Button } from "@/components/ui/button";
import type { Address } from "./types";
import { addressFields } from "./InquiryForm";

export function AddressesPage() {
  const q = useData<Address[]>("addresses");
  const [selected, setSelected] = useState<Address | null>(null);
  const [editing, setEditing] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <>
      <Heading
        title="地址簿"
        description="保存常用的美国提送货地址，询价时可直接选择。修改地址不会改变已提交的运输资料。"
        action={
          <Button
            onClick={(event) => {
              returnFocus.current = event.currentTarget;
              setSelected(null);
              setEditing(true);
            }}
          >
            新增地址
          </Button>
        }
      />
      <BusinessSection title="运输资料">
        {!q.data ? (
          <Loading error={q.error} retry={() => q.refetch()} />
        ) : (
          <>
            <Table head={["场所名称", "完整地址", "联系人", "范围", "操作"]}>
              {q.data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.data.name}</TableCell>
                  <TableCell className="business-address">
                    {a.data.street}
                    <br />
                    {a.data.city}, {a.data.state} {a.data.postalCode}
                  </TableCell>
                  <TableCell>
                    {a.data.contact}
                    <br />
                    {a.data.phone}
                  </TableCell>
                  <TableCell>
                    {a.scope === "public" ? "公共地址" : "本公司"}
                  </TableCell>
                  <TableCell>
                    {a.scope !== "public" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          returnFocus.current = event.currentTarget;
                          setSelected(a);
                          setEditing(true);
                        }}
                      >
                        编辑
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </Table>
            {!q.data.length && (
              <Empty text="地址簿为空，可点击新增地址保存常用地址" />
            )}
          </>
        )}
      </BusinessSection>
      {editing && (
        <AddressEditor
          key={selected?.id ?? "new"}
          address={selected}
          returnFocus={returnFocus}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
function AddressEditor({
  address: a,
  onClose,
  returnFocus,
}: {
  address: Address | null;
  onClose: () => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const operation = useOperation();
  const formId = useId();
  return (
    <OperationPanel
      open
      onClose={onClose}
      returnFocus={returnFocus}
      busy={operation.busy}
      title={a ? "编辑地址" : "新增地址"}
      description="完整填写场所及联系人信息。新增地址仅本公司可见。"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={operation.busy}
            onClick={onClose}
          >
            取消
          </Button>
          <Button form={formId} disabled={operation.busy}>
            {operation.busy ? "保存中…" : "保存地址"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <ErrorNotice message={operation.error} />
        <form
          id={formId}
          onSubmit={async (event) => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(event.currentTarget));
            const result = await operation.run(() =>
              api(
                a ? "addresses/" + a.id : "addresses",
                a ? "PATCH" : "POST",
                a ? { expectedVersion: a.version, data } : data,
              ),
            );
            if (result) onClose();
          }}
        >
          <FieldGroup className="grid gap-5 sm:grid-cols-2">
            {addressFields.map((f) => (
              <Field
                key={f.key}
                name={f.key}
                label={f.label}
                placeholder={f.placeholder}
                value={a?.data[f.key]}
                disabled={operation.busy}
              />
            ))}
            <UiField className="form-field">
              <FieldLabel htmlFor="type">地址类型</FieldLabel>
              <NativeSelect
                name="type"
                id="type"
                disabled={operation.busy}
                defaultValue={a?.data.type ?? "commercial"}
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
              <FieldLabel htmlFor="timezone">地址所在时区</FieldLabel>
              <NativeSelect
                name="timezone"
                id="timezone"
                disabled={operation.busy}
                defaultValue={a?.data.timezone ?? "America/Los_Angeles"}
              >
                {[
                  ["America/Los_Angeles", "美国太平洋时间"],
                  ["America/Denver", "美国山地时间"],
                  ["America/Chicago", "美国中部时间"],
                  ["America/New_York", "美国东部时间"],
                  ["America/Phoenix", "美国亚利桑那时间"],
                  ["America/Anchorage", "美国阿拉斯加时间"],
                  ["Pacific/Honolulu", "美国夏威夷时间"],
                ].map(([value, label]) => (
                  <NativeSelectOption key={value} value={value}>
                    {label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </UiField>
          </FieldGroup>
        </form>
      </div>
    </OperationPanel>
  );
}
