import { BusinessSection } from "./shared";
import { FieldGroup } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import {
  Table as UiTable,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import type { InquiryInput } from "@/modules/business/contracts";
export function Shipment({ data }: { data: InquiryInput }) {
  return (
    <BusinessSection title={<>运输信息</>}>
      <div className="panel-header">
        <span>{data.pickupDate} · LTL</span>
      </div>
      <FieldGroup className="form-grid">
        {(["origin", "destination"] as const).map((side, i) => (
          <div key={side} className="business-address">
            <h3>{i === 0 ? "提货地址" : "收货地址"}</h3>
            <p>{data[side].name}</p>
            <p>{data[side].street}</p>
            <p>
              {data[side].city}, {data[side].state} {data[side].postalCode}
            </p>
            <p>
              {data[side].contact} · {data[side].phone}
            </p>
            <small className="muted">
              {data[side].type === "commercial" ? "商业地址" : "住宅地址"} ·{" "}
              {data[side].timezone}
            </small>
          </div>
        ))}
      </FieldGroup>
      <Separator className="business-rule" />
      <div className="table-scroll">
        <UiTable className="data-table">
          <TableHeader>
            <TableRow>
              <TableHead>货物</TableHead>
              <TableHead>件数</TableHead>
              <TableHead>单件重量 lb</TableHead>
              <TableHead>单件尺寸 in</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.goods.map((g, i) => (
              <TableRow key={i}>
                <TableCell>{g.name}</TableCell>
                <TableCell>{g.quantity}</TableCell>
                <TableCell>{g.weight}</TableCell>
                <TableCell>
                  {g.length} × {g.width} × {g.height}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </UiTable>
      </div>
      <p className="page-description">
        附加服务：
        {data.services
          .map(
            (s) =>
              ({ liftgate: "尾板", appointment: "预约", inside: "室内交付" })[
                s
              ],
          )
          .join("、") || "无"}
      </p>
      {data.reference && <p>客户参考号：{data.reference}</p>}
      {data.notes && <p className="business-address">备注：{data.notes}</p>}
    </BusinessSection>
  );
}
