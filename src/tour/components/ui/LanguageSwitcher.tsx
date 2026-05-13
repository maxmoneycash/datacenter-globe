"use client";

import { useAppStore } from "@tour/lib/store";
import { getUi } from "@tour/lib/i18n/ui";
import { cn } from "@tour/lib/utils";
export function LanguageSwitcher() {
  const locale = useAppStore((s) => s.locale);
  const setLocale = useAppStore((s) => s.setLocale);
  const ui = getUi(locale);

  return (
    <div
      className="glass flex items-center gap-0.5 rounded-full p-0.5 text-[11px]"
      role="group"
      aria-label={ui.language}
    >
      <LangBtn
        active={locale === "en"}
        onClick={() => setLocale("en")}
        label={ui.english}
      />
      <LangBtn
        active={locale === "zh"}
        onClick={() => setLocale("zh")}
        label={ui.chinese}
      />
    </div>
  );
}

function LangBtn({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-2.5 py-1 font-medium tracking-wide transition-colors",
        active
          ? "bg-white text-black"
          : "text-white/70 hover:bg-white/5 hover:text-white",
      )}
    >
      {label}
    </button>
  );
}
