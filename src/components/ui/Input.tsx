import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium text-text-secondary"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-9 w-full rounded-lg px-3",
            "bg-bg-elevated text-text-primary",
            "border border-border-default",
            "placeholder:text-text-tertiary",
            "transition-colors duration-100",
            "hover:border-border-default",
            "focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-1 focus:ring-offset-bg-primary focus:border-transparent",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "font-mono text-sm",
            error && "border-accent-danger focus:ring-accent-danger",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-accent-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
