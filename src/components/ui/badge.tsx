import clsx from "clsx";

export function Badge({
  children,
  className,
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        variant === "default" && "border-[color:var(--border)] bg-[color:var(--topbar)] text-slate-700",
        variant === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        variant === "warning" && "border-amber-200 bg-amber-50 text-amber-900",
        variant === "danger" && "border-red-200 bg-red-50 text-red-700",
        className,
      )}
    >
      {children}
    </span>
  );
}
