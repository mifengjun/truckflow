import Link from "next/link";
import { Truck } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import type { ReactNode } from "react";
export function AuthFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main
      id="main-content"
      className="production-auth mx-auto flex min-h-svh w-full max-w-lg flex-col justify-center gap-7 px-5 py-10"
    >
      <Link
        href="/"
        className="flex items-center gap-3 font-semibold text-primary"
      >
        <Truck aria-hidden />
        Truckflow
        <span className="text-sm text-muted-foreground">美国 LTL 卡派</span>
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>{title}</h1>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}
