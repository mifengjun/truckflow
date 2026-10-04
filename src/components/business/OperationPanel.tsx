"use client";

import type { ReactNode, RefObject } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Props = {
  kind?: "dialog" | "sheet";
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  busy?: boolean;
  wide?: boolean;
  returnFocus?: RefObject<HTMLElement | null>;
  children: ReactNode;
  footer: ReactNode;
};

/** Keep the page's list in place while an operation is open. */
export function OperationPanel({
  kind = "sheet",
  open,
  onClose,
  title,
  description,
  busy = false,
  wide = false,
  returnFocus,
  children,
  footer,
}: Props) {
  function changeOpen(next: boolean) {
    if (!next && !busy) onClose();
  }
  function restoreFocus(event: Event) {
    const trigger = returnFocus?.current;
    const target = trigger?.isConnected
      ? trigger
      : document.querySelector<HTMLElement>("#main-content h1");
    if (target) {
      event.preventDefault();
      target.focus();
    }
  }
  if (kind === "dialog")
    return (
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent
          className="production-overlay flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl"
          showCloseButton={!busy}
          onCloseAutoFocus={restoreFocus}
        >
          <DialogHeader className="shrink-0 border-b p-6 pr-12">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-5">{children}</div>
          </div>
          <DialogFooter className="shrink-0 border-t px-6 py-4">
            {footer}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  return (
    <Sheet open={open} onOpenChange={changeOpen}>
      <SheetContent
        className={cn(
          "production-overlay w-full gap-0 sm:max-w-2xl",
          wide && "sm:max-w-4xl",
        )}
        showCloseButton={!busy}
        onCloseAutoFocus={restoreFocus}
      >
        <SheetHeader className="shrink-0 border-b p-6 pr-12">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="flex flex-col gap-5">{children}</div>
        </div>
        <SheetFooter className="shrink-0 flex-row justify-end border-t px-6 py-4">
          {footer}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
