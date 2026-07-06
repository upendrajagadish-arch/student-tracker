"use client";

import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "flex items-start gap-3 rounded-xl border px-4 py-3 shadow-elevated",
              t.type === "success" &&
                "border-emerald-200 bg-emerald-50 text-emerald-800",
              t.type === "error" && "border-red-200 bg-red-50 text-red-800",
              t.type === "info" && "border-surface-border bg-white text-slate-800"
            )}
          >
            {t.type === "success" && (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            {t.type === "error" && (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p className="flex-1 text-sm font-medium">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
