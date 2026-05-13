import { MODULES_BY_ID } from "./modules";
import { LAYERS_BY_ID } from "./layers";
import type { Locale } from "./i18n/locale";
import { MODULES_ZH } from "./i18n/zh/moduleStops";
import { LAYERS_ZH } from "./i18n/zh/layerStops";
import type { CameraStop, StopId, StopMeta } from "./types";

/**
 * Unified lookup that returns the meta for either a physical module or a
 * verification layer, given a stop id. This lets caption / detail panel /
 * tour controls treat both kinds of stops uniformly.
 */
export function getStopMeta(id: StopId, locale: Locale = "en"): StopMeta {
  if (locale === "zh") {
    const mz = MODULES_ZH[id as keyof typeof MODULES_ZH];
    if (mz) return mz;
    const lz = LAYERS_ZH[id as keyof typeof LAYERS_ZH];
    if (lz) return lz;
  }
  const m = (MODULES_BY_ID as Record<string, StopMeta>)[id];
  if (m) return m;
  const l = (LAYERS_BY_ID as Record<string, StopMeta>)[id];
  if (l) return l;
  throw new Error(`Unknown stop id: ${id}`);
}

export function isLayerStop(stop: CameraStop): boolean {
  return stop.kind === "layer";
}

export function isModuleStop(stop: CameraStop): boolean {
  return stop.kind === "module";
}
