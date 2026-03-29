import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  className,
  title,
  description,
  action,
}: HTMLAttributes<HTMLDivElement> & {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.6rem] border border-dashed border-white/12 bg-white/[0.03] p-6 text-left",
        className,
      )}
    >
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-xl text-sm text-stone-400">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
