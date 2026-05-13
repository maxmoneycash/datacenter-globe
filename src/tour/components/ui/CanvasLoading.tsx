"use client";

import { useAppStore } from "@tour/lib/store";
import { getUi } from "@tour/lib/i18n/ui";

export function CanvasLoading() {
  const locale = useAppStore((s) => s.locale);
  const ui = getUi(locale);
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#07090d]">
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-10 w-10">
          <span className="absolute inset-0 animate-ping rounded-full bg-[var(--color-compute)] opacity-30" />
          <span className="absolute inset-2 rounded-full bg-[var(--color-compute)]" />
        </div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/55">
          {ui.loading}
        </p>
      </div>
    </div>
  );
}
