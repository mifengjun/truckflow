import { VerificationNotice } from "@/components/business/VerificationNotice";
import { registrationEnabled } from "@/modules/business/registration";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const p = await searchParams;
  return (
    <VerificationNotice
      invalid={p.status === "invalid"}
      enabled={registrationEnabled()}
    />
  );
}
