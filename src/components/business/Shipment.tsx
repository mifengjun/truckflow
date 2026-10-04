import type { InquiryInput } from "@/modules/business/contracts";
export function Shipment({ data }: { data: InquiryInput }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>运输信息</h2>
        <span>{data.pickupDate} · LTL</span>
      </div>
      <div className="form-grid">
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
      </div>
      <hr className="business-rule" />
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>货物</th>
              <th>件数</th>
              <th>单件重量 lb</th>
              <th>单件尺寸 in</th>
            </tr>
          </thead>
          <tbody>
            {data.goods.map((g, i) => (
              <tr key={i}>
                <td>{g.name}</td>
                <td>{g.quantity}</td>
                <td>{g.weight}</td>
                <td>
                  {g.length} × {g.width} × {g.height}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </section>
  );
}
