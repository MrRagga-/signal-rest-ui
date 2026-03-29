import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-[1.4rem] border border-white/10 bg-black/20 px-4 py-3 text-sm text-stone-100 outline-none placeholder:text-stone-500 focus:border-emerald-300/40 focus:bg-black/30",
        className,
      )}
      {...props}
    />
  );
}
