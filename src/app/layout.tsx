import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Truckflow · 交互原型',description:'卡派客户中心与管理后台的可交互设计原型'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body><a className="skip-link" href="#main-content">跳转到主要内容</a>{children}</body></html>;}
