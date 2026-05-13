"use client";

import { useAppStore } from "@tour/lib/store";
import { getUi } from "@tour/lib/i18n/ui";
import { MousePointerClick, Move3D } from "lucide-react";

export function FreeModeHint() {
  const mode = useAppStore((s) => s.mode);
  const detailOpen = useAppStore((s) => s.detailOpen);
  const locale = useAppStore((s) => s.locale);
  const ui = getUi(locale);
  if (mode !== "free" || detailOpen) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center px-6">
      <div className="glass flex items-center gap-4 rounded-full px-5 py-2.5 text-[11.5px] text-white/75">
        <span className="flex items-center gap-1.5">
          <Move3D size={13} className="text-white/55" />
          {ui.freeHintDrag}
        </span>
        <span className="h-3 w-px bg-white/15" />
        <span className="flex items-center gap-1.5">
          <MousePointerClick size={13} className="text-white/55" />
          {ui.freeHintClick}
        </span>
      </div>
    </div>
  );
}
