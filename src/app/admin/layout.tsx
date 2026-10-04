import { BusinessLayout } from "@/components/business/Layout";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <BusinessLayout identity="staff">{children}</BusinessLayout>;
}
