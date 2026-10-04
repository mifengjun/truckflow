"use client";
import { useSearchParams } from "next/navigation";
import { InquiryForm } from "./InquiryForm";
import { InquiryList, InquiryDetail } from "./Inquiries";
import { OrderList, OrderConfirm, OrderDetail } from "./Orders";
import { FinancePage, Settlement } from "./Finance";
import { CustomersPage, CustomerDetail } from "./Customers";
import { StaffPage } from "./Staff";
import { AddressesPage } from "./Addresses";
import { Heading, TextLink } from "./shared";
export function BusinessRouter({
  path = [],
  staff = false,
}: {
  path?: string[];
  staff?: boolean;
}) {
  const params = useSearchParams(),
    [section, id] = path;
  if (section === "orders" && id === "new" && !staff)
    return (
      <OrderConfirm
        inquiryId={params.get("inquiry") ?? ""}
        quoteId={params.get("quote") ?? ""}
      />
    );
  if (section === "orders")
    return id ? (
      <OrderDetail id={id} staff={staff} />
    ) : (
      <OrderList staff={staff} />
    );
  if (section === "inquiries")
    return id ? (
      <InquiryDetail id={id} staff={staff} />
    ) : (
      <InquiryList staff={staff} />
    );
  if (section === "inquiry" && !staff) return <InquiryForm />;
  if (section === "finance" && !staff) return <FinancePage />;
  if (section === "addresses" && !staff) return <AddressesPage />;
  if (section === "settlement" && staff) return <Settlement />;
  if (section === "customers" && staff)
    return id ? <CustomerDetail id={id} /> : <CustomersPage />;
  if (section === "staff" && staff && !id) return <StaffPage />;
  return (
    <>
      <Heading title="页面不存在" />
      <TextLink href={staff ? "/admin/orders" : "/portal/orders"}>
        返回订单列表
      </TextLink>
    </>
  );
}
