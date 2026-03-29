import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-stone-100 outline-none ring-0 placeholder:text-stone-500 focus:border-emerald-300/40 focus:bg-black/30",
        className,
      )}
      {...props}
    />
  );
}
