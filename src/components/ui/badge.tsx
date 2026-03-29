import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border border-emerald-200/10 bg-emerald-400/10 px-3 py-1 text-left font-mono text-[11px] uppercase leading-[1.35] tracking-[0.24em] text-emerald-200",
        className,
      )}
      {...props}
    />
  );
}
