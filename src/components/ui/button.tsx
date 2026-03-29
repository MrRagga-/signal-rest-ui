import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full border text-sm font-semibold transition active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border-emerald-300/20 bg-emerald-400 text-emerald-950 shadow-[0_10px_30px_rgba(72,213,151,0.24)] hover:bg-emerald-300",
        secondary:
          "border-stone-400/15 bg-white/5 text-stone-100 hover:bg-white/8",
        ghost: "border-transparent bg-transparent text-stone-200 hover:bg-white/6",
        danger:
          "border-rose-300/20 bg-rose-400/90 text-rose-950 hover:bg-rose-300",
      },
      size: {
        sm: "h-9 px-4",
        md: "h-11 px-5",
        lg: "h-12 px-6",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
