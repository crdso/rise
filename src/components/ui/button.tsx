import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent)] text-[var(--accent-foreground)] hover:bg-[var(--accent-strong)] shadow-[0_8px_20px_var(--glow)] hover:shadow-[0_10px_28px_var(--glow)] hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98]",
        ghost: "bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--card-soft)] hover:text-[var(--foreground)]",
        soft: "bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white border border-transparent",
        outline: "bg-transparent border border-[var(--border-strong)] text-[var(--foreground)] hover:bg-[var(--card-soft)]",
        muted: "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--border-strong)] shadow-sm",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-8 px-4 text-[13px]",
        lg: "h-11 px-7 text-[15px]",
        icon: "h-10 w-10 p-0 rounded-full",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
));
Button.displayName = "Button";
