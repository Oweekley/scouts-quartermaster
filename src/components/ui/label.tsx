"use client";

import * as React from "react";
import clsx from "clsx";

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, ...props }: LabelProps) {
  return <label className={clsx("text-sm font-medium text-slate-900", className)} {...props} />;
}

