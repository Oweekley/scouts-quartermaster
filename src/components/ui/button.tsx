"use client";

import * as React from "react";
import clsx from "clsx";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-md border text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)] focus:ring-offset-2",
        // Mobile-first: minimum ~44px touch targets.
        size === "sm" ? "h-10 px-3 md:h-8" : "h-11 px-4 md:h-9",
        variant === "primary" &&
          "border-[color:var(--primary)] bg-[color:var(--primary)] text-white hover:brightness-95",
        variant === "secondary" &&
          "border-[color:var(--border)] bg-white text-slate-900 hover:bg-slate-50",
        variant === "danger" && "border-red-600 bg-red-600 text-white hover:bg-red-700",
        variant === "ghost" && "border-transparent bg-transparent text-slate-900 hover:bg-slate-100",
        className,
      )}
      {...props}
    />
  );
}
