import { redirect } from "next/navigation";
import { requireActor } from "@/infrastructure/auth/actor";
import { readConfig } from "@/infrastructure/config";
import { homeForActor } from "@/modules/business/rules";
import { Shell } from "./Shell";
export async function BusinessLayout({
  identity,
  children,
}: {
  identity: "customer" | "staff";
  children: React.ReactNode;
}) {
  const actor = await requireActor().catch(() => null);
  if (!actor) redirect("/login");
  if (actor.identity !== identity) redirect(homeForActor(actor));
  return (
    <Shell actor={actor} environment={readConfig().environment}>
      {children}
    </Shell>
  );
}
