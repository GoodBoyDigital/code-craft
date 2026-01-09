import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "primary" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          "inline-flex items-center justify-center gap-2",
          "font-medium transition-all duration-100",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary",
          "disabled:pointer-events-none disabled:opacity-50",

          // Variants
          {
            default:
              "bg-bg-elevated text-text-primary border border-border-default hover:bg-bg-hover hover:border-border-default",
            ghost:
              "text-text-secondary hover:text-text-primary hover:bg-bg-hover",
            primary:
              "bg-accent-primary text-white hover:bg-accent-primary/90 shadow-sm shadow-accent-primary/20",
            danger:
              "bg-accent-danger text-white hover:bg-accent-danger/90 shadow-sm shadow-accent-danger/20",
          }[variant],

          // Sizes
          {
            sm: "h-7 px-2.5 text-xs rounded",
            md: "h-8 px-3 text-sm rounded",
            lg: "h-9 px-4 text-sm rounded-lg",
          }[size],

          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
