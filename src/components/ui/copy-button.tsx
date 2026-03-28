"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  variant = "secondary",
  className,
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          // ignore
        }
      }}
    >
      {copied ? copiedLabel : label}
    </Button>
  );
}

