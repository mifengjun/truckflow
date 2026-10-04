import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Truckflow · 卡派协同工作台",
  description: "美国 LTL 询价、订单与预付资金管理",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <a className="skip-link" href="#main-content">
          跳转到主要内容
        </a>
        {children}
      </body>
    </html>
  );
}
