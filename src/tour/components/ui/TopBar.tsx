"use client";

import { useAppStore } from "@tour/lib/store";
import { getUi } from "@tour/lib/i18n/ui";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ModeSwitcher } from "./ModeSwitcher";

export function TopBar() {
  const locale = useAppStore((s) => s.locale);
  const ui = getUi(locale);

  return (
    <header className="pointer-events-none absolute top-0 left-0 right-0 z-30 flex items-start justify-between px-5 pt-5">
      <div className="pointer-events-auto flex items-center gap-3">
        <div
          className="h-2.5 w-2.5 rounded-full pulse-soft"
          style={{
            background: "var(--color-compute)",
            boxShadow: "0 0 12px var(--color-compute)",
          }}
        />
        <div>
          <h1 className="text-sm font-semibold tracking-wide text-white">
            {ui.appTitle}
          </h1>
          <p className="text-[11px] text-white/50">{ui.appSubtitle}</p>
        </div>
      </div>
      <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
        <LanguageSwitcher />
        <ModeSwitcher />
      </div>
    </header>
  );
}
