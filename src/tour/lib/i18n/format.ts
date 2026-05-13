import type { Locale } from "./locale";

export function formatTourStopLine(
  locale: Locale,
  stepIndex: number,
  total: number,
): string {
  const n = stepIndex + 1;
  if (locale === "zh") return `第 ${n} 站，共 ${total} 站`;
  return `Stop ${n} of ${total}`;
}
