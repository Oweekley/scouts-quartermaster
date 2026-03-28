"use client";

import * as React from "react";
import clsx from "clsx";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={clsx(
        // Mobile-first: bigger inputs for touch + readability.
        "h-11 w-full rounded-md border border-[color:var(--border)] bg-white px-3 text-sm outline-none ring-offset-white focus:ring-2 focus:ring-[color:var(--primary)] focus:ring-offset-2 disabled:opacity-50 md:h-9",
        className,
      )}
      {...props}
    />
  );
}
