"use client";
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
        <section className="panel">
          {!q.data ? (
            <Loading error={q.error} retry={() => q.refetch()} />
          ) : (
            <>
              <Table head={["场所名称", "完整地址", "联系人", "范围", "操作"]}>
                {q.data.map((a) => (
                  <tr key={a.id}>
                    <td>{a.data.name}</td>
                    <td className="business-address">
                      {a.data.street}
                      <br />
                      {a.data.city}, {a.data.state} {a.data.postalCode}
                    </td>
                    <td>
                      {a.data.contact}
                      <br />
                      {a.data.phone}
                    </td>
                    <td>{a.scope === "public" ? "公共地址" : "本公司"}</td>
                    <td>
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
                    </td>
                  </tr>
                ))}
              </Table>
              {!q.data.length && <Empty text="地址簿为空，可新增常用地址" />}
            </>
          )}
        </section>
        {editing ? (
          <AddressEditor
            key={selected?.id ?? "new"}
            address={selected}
            onDone={() => setEditing(false)}
          />
        ) : (
          <section className="panel">
            <h2>常用地址</h2>
            <p className="page-description">
              新增的地址仅本公司可见。修改地址不会改变已提交的询价与订单快照。
            </p>
          </section>
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
    <section className="panel">
      <h2>{a ? "编辑地址" : "新增地址"}</h2>
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
        {addressFields.map((f) => (
          <Field
            key={f.key}
            name={f.key}
            label={f.label}
            value={a?.data[f.key]}
          />
        ))}
        <div className="form-field">
          <label htmlFor="type">地址类型</label>
          <select
            name="type"
            id="type"
            className="input"
            defaultValue={a?.data.type ?? "commercial"}
          >
            <option value="commercial">商业地址</option>
            <option value="residential">住宅地址</option>
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="timezone">地址所在时区</label>
          <select
            name="timezone"
            id="timezone"
            className="input"
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
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <Button disabled={operation.busy}>
          {operation.busy ? "保存中…" : "保存地址"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          取消
        </Button>
      </form>
    </section>
  );
}
