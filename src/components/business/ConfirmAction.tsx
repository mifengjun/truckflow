"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { ErrorNotice } from "./shared";

export function ConfirmAction({
  label,
  title,
  description,
  confirmLabel,
  busy,
  onConfirm,
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false),
    [failed, setFailed] = useState(false);
  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) {
          setOpen(value);
          setFailed(false);
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={busy}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <ErrorNotice
          message={failed ? "操作未完成，请检查页面提示后重试。" : undefined}
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={async (e) => {
              e.preventDefault();
              const result = await onConfirm();
              if (result !== undefined) setOpen(false);
              else setFailed(true);
            }}
          >
            {busy ? "处理中…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
