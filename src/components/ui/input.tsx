import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-[14px] text-[var(--foreground)] placeholder:text-[var(--faint)] focus-visible:outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)] transition-all",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
