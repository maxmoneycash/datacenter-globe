"use client";

import type { ColorKey } from "@tour/lib/types";
import { cn } from "@tour/lib/utils";

export function colorVar(c: ColorKey): string {
  return `var(--color-${c})`;
}

export function ColorChip({
  colorKey,
  className,
}: {
  colorKey: ColorKey;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block h-2.5 w-2.5 rounded-full", className)}
      style={{
        background: colorVar(colorKey),
        boxShadow: `0 0 10px ${colorVar(colorKey)}`,
      }}
    />
  );
}
