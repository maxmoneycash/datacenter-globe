"use client";

import { useAppStore } from "@tour/lib/store";
import { getUi } from "@tour/lib/i18n/ui";
import { cn } from "@tour/lib/utils";

export function ModeSwitcher() {
  const mode = useAppStore((s) => s.mode);
  const locale = useAppStore((s) => s.locale);
  const setMode = useAppStore((s) => s.setMode);
  const ui = getUi(locale);

  return (
    <div className="glass flex items-center gap-1 rounded-full p-1 text-xs">
      <Btn active={mode === "tour"} onClick={() => setMode("tour")}>
        {ui.tour}
      </Btn>
      <Btn active={mode === "free"} onClick={() => setMode("free")}>
        {ui.free}
      </Btn>
    </div>
  );
}

function Btn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full font-medium tracking-wide uppercase transition-colors",
        active
          ? "bg-white text-black"
          : "text-white/70 hover:text-white hover:bg-white/5",
      )}
    >
      {children}
    </button>
  );
}
