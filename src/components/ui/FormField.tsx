"use client";

import { cn } from "@/lib/utils";
import {
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
} from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  children?: ReactNode;
}

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, hint, className, id, children, required, ...props }, ref) => {
    const fieldId = id ?? props.name;

    return (
      <div className="space-y-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        {children ?? (
          <input
            ref={ref}
            id={fieldId}
            className={cn(
              "flex h-10 w-full rounded-xl border bg-white/90 px-3 py-2 text-sm text-slate-900 shadow-inner-soft placeholder:text-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25 disabled:cursor-not-allowed disabled:opacity-50",
              error
                ? "border-red-300 focus-visible:ring-red-500"
                : "border-surface-border",
              className
            )}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
            }
            required={required}
            {...props}
          />
        )}
        {hint && !error && (
          <p id={`${fieldId}-hint`} className="text-xs text-slate-500">
            {hint}
          </p>
        )}
        {error && (
          <p id={`${fieldId}-error`} className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";

export { FormField };
