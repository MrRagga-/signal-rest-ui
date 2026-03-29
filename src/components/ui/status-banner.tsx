import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatusBannerVariant = "info" | "success" | "warning" | "error";

const variantClasses: Record<StatusBannerVariant, string> = {
  info: "border-sky-200/10 bg-sky-400/10 text-sky-100",
  success: "border-emerald-200/10 bg-emerald-400/10 text-emerald-100",
  warning: "border-amber-200/10 bg-amber-300/10 text-amber-50",
  error: "border-rose-200/10 bg-rose-400/10 text-rose-100",
};

export function StatusBanner({
  className,
  title,
  children,
  variant = "info",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  title?: string;
  children: ReactNode;
  variant?: StatusBannerVariant;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.35rem] border px-4 py-3 text-sm",
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={title ? "mt-1 text-sm/6" : "text-sm/6"}>{children}</div>
    </div>
  );
}
