"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

type Preview = { url: string; mime: string } | { error: true } | null;

export function ProofPreview({ proofId }: { proofId: string }) {
  const [preview, setPreview] = useState<Preview>(null);
  const [attempt, setAttempt] = useState(0);
  const download = "/api/v1/attachments/" + proofId + "/download";
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | undefined;
    let active = true;
    async function load() {
      try {
        const response = await fetch(download, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Preview unavailable");
        const blob = await response.blob();
        if (!["application/pdf", "image/png", "image/jpeg"].includes(blob.type))
          throw new Error("Unsupported preview");
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({ url: objectUrl, mime: blob.type });
      } catch {
        if (active) setPreview({ error: true });
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [download, attempt]);
  return (
    <div className="flex flex-col gap-4">
      {!preview ? (
        <div role="status">
          <span className="sr-only">正在加载转账凭证…</span>
          <Skeleton className="h-80 w-full" />
        </div>
      ) : "error" in preview ? (
        <Alert>
          <AlertDescription className="flex flex-col items-start gap-3">
            凭证暂无法预览，可打开原文件查看。
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setPreview(null);
                setAttempt((value) => value + 1);
              }}
            >
              重新加载
            </Button>
          </AlertDescription>
        </Alert>
      ) : preview.mime === "application/pdf" ? (
        <iframe
          title="转账凭证 PDF"
          src={preview.url}
          className="h-[55dvh] min-h-72 w-full rounded-md border"
        />
      ) : (
        // Blob URLs are local previews and cannot use the Next image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.url}
          alt="客户提交的转账凭证"
          onError={() => setPreview({ error: true })}
          className="max-h-[60dvh] w-full rounded-md border object-contain"
        />
      )}
      <Button variant="outline" size="sm" asChild className="self-start">
        <a href={download} target="_blank" rel="noreferrer">
          打开原始凭证
        </a>
      </Button>
    </div>
  );
}
