"use client";

import { useLayoutEffect } from "react";
import { useAppStore } from "@tour/lib/store";
import { LOCALE_STORAGE_KEY } from "@tour/lib/i18n/locale";
import type { Locale } from "@tour/lib/i18n/locale";

function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw === "zh" || raw === "en") return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function LocaleHydration() {
  const setLocale = useAppStore((s) => s.setLocale);
  const locale = useAppStore((s) => s.locale);

  useLayoutEffect(() => {
    const stored = readStoredLocale();
    if (stored) setLocale(stored);
  }, [setLocale]);

  useLayoutEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-Hans" : "en";
  }, [locale]);

  return null;
}
