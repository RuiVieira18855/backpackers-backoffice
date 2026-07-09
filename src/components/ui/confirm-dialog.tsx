"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive. Default: false. */
  destructive?: boolean;
};

type ConfirmContextValue = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

type PendingState = {
  opts: ConfirmOptions;
  resolve: (ok: boolean) => void;
};

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingState | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ opts, resolve });
      }),
    [],
  );

  const close = useCallback(
    (result: boolean) => {
      if (pending) {
        pending.resolve(result);
        setPending(null);
      }
    },
    [pending],
  );

  useEffect(() => {
    if (!pending) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    };
    window.addEventListener("keydown", handler);
    // Focus the confirm button so Enter works out of the box.
    setTimeout(() => confirmRef.current?.focus(), 30);
    return () => window.removeEventListener("keydown", handler);
  }, [pending, close]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm"
          onClick={() => close(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onClick={(e) => e.stopPropagation()}
            className="rounded-md border border-border bg-card shadow-xl max-w-md w-full mx-4 p-6 animate-in fade-in-0 zoom-in-95"
          >
            <div className="flex items-start gap-3">
              {pending.opts.destructive && (
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <h2 id="confirm-title" className="text-base font-medium text-foreground">
                  {pending.opts.title}
                </h2>
                {pending.opts.description && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {pending.opts.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="ghost" size="sm" onClick={() => close(false)}>
                {pending.opts.cancelLabel ?? "Cancelar"}
              </Button>
              <Button
                ref={confirmRef}
                size="sm"
                onClick={() => close(true)}
                className={cn(
                  pending.opts.destructive &&
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
                )}
              >
                {pending.opts.confirmLabel ?? "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue["confirm"] {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Fallback to native confirm when provider isn't mounted, so components
    // can still work in isolation (e.g. tests).
    return (opts) =>
      Promise.resolve(
        window.confirm(
          opts.description ? `${opts.title}\n\n${opts.description}` : opts.title,
        ),
      );
  }
  return ctx.confirm;
}
