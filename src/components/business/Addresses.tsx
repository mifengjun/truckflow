"use client";
import { BusinessSection } from "./shared";
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
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
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
import type { Address } from "./types";
import { addressFields } from "./InquiryForm";
export function AddressesPage() {
  const q = useData<Address[]>("addresses"),
    [selected, setSelected] = useState<Address | null>(null),
    [editing, setEditing] = useState(false);
  return (
    <>
      <Heading
        title="地址簿"
        description="保存完整的美国提货和收货地址，询价时可直接选择。"
        action={
          <Button
            onClick={() => {
              setSelected(null);
              setEditing(true);
            }}
          >
            新增地址
          </Button>
        }
      />
      <div className="business-detail">
        <BusinessSection title={<>运输资料</>}>
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
                          onClick={() => {
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
              {!q.data.length && <Empty text="地址簿为空，可新增常用地址" />}
            </>
          )}
        </BusinessSection>
        {editing ? (
          <AddressEditor
            key={selected?.id ?? "new"}
            address={selected}
            onDone={() => setEditing(false)}
          />
        ) : (
          <BusinessSection title={<>常用地址</>}>
            <p className="page-description">
              新增的地址仅本公司可见。修改地址不会改变已提交的询价与订单快照。
            </p>
          </BusinessSection>
        )}
      </div>
    </>
  );
}
function AddressEditor({
  address: a,
  onDone,
}: {
  address: Address | null;
  onDone: () => void;
}) {
  const operation = useOperation();
  return (
    <BusinessSection title={<>{a ? "编辑地址" : "新增地址"}</>}>
      <ErrorNotice message={operation.error} />
      <form
        className="business-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(e.currentTarget));
          const result = await operation.run(() =>
            api(
              a ? `addresses/${a.id}` : "addresses",
              a ? "PATCH" : "POST",
              a ? { expectedVersion: a.version, data } : data,
            ),
          );
          if (result) onDone();
        }}
      >
        <FieldGroup>
          {addressFields.map((f) => (
            <Field
              key={f.key}
              name={f.key}
              label={f.label}
              value={a?.data[f.key]}
            />
          ))}
          <UiField className="form-field">
            <FieldLabel htmlFor="type">地址类型</FieldLabel>
            <NativeSelect
              name="type"
              id="type"

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

              defaultValue={a?.data.timezone ?? "America/Los_Angeles"}
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
          <Button disabled={operation.busy}>
            {operation.busy ? "保存中…" : "保存地址"}
          </Button>
          <Button type="button" variant="ghost" onClick={onDone}>
            取消
          </Button>
        </FieldGroup>
      </form>
    </BusinessSection>
  );
}
