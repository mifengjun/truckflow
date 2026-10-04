import { redirect } from "next/navigation";
import { requireActor } from "@/infrastructure/auth/actor";
import { homeForActor } from "@/modules/business/rules";
import { Suspense } from "react";
import { BusinessRouter } from "@/components/business/Router";
export default async function Page({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path } = await params;
  if (!path?.length) redirect(homeForActor(await requireActor()));
  return (
    <Suspense fallback={<p>正在加载…</p>}>
      <BusinessRouter path={path} staff />
    </Suspense>
  );
}
