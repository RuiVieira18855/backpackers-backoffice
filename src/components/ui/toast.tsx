"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { AlertCircle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info" | "warning";

type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
  /** Optional secondary line, e.g. an error hint. */
  detail?: string;
  /** Auto-dismiss after N ms. Default 4000. */
  duration?: number;
};

type ToastContextValue = {
  toast: (t: Omit<Toast, "id" | "kind"> & { kind?: ToastKind }) => void;
  success: (message: string, detail?: string) => void;
  error: (message: string, detail?: string) => void;
  info: (message: string, detail?: string) => void;
  warning: (message: string, detail?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = `t${++toastCounter}`;
    const item: Toast = { duration: 4000, ...t, id };
    setItems((cur) => [...cur, item]);
    if (item.duration && item.duration > 0) {
      setTimeout(() => dismiss(id), item.duration);
    }
  }, [dismiss]);

  const api: ToastContextValue = {
    toast: (t) => push({ kind: t.kind ?? "info", ...t }),
    success: (message, detail) => push({ kind: "success", message, detail }),
    error: (message, detail) =>
      push({ kind: "error", message, detail, duration: 7000 }),
    info: (message, detail) => push({ kind: "info", message, detail }),
    warning: (message, detail) => push({ kind: "warning", message, detail }),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Silent noop fallback if a component renders outside the provider.
    return {
      toast: () => undefined,
      success: () => undefined,
      error: () => undefined,
      info: () => undefined,
      warning: () => undefined,
    };
  }
  return ctx;
}

const ICON: Record<ToastKind, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const STYLES: Record<ToastKind, string> = {
  success: "border-accent bg-accent/10 text-foreground",
  error: "border-destructive bg-destructive/10 text-destructive-foreground",
  warning: "border-amber-500 bg-amber-500/10 text-foreground",
  info: "border-border bg-card text-foreground",
};

function ToastViewport({
  items,
  onDismiss,
}: {
  items: Toast[];
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    // Escape dismisses the latest toast.
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && items.length > 0) {
        onDismiss(items[items.length - 1].id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [items, onDismiss]);

  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {items.map((t) => {
        const Icon = ICON[t.kind];
        return (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-md border px-3 py-2 shadow-lg animate-in slide-in-from-right",
              STYLES[t.kind],
            )}
          >
            <Icon className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-snug">{t.message}</p>
              {t.detail && (
                <p className="text-xs opacity-80 mt-0.5 leading-snug">
                  {t.detail}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss"
              className="opacity-60 hover:opacity-100 shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
