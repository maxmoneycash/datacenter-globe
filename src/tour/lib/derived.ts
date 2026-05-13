import { TOUR_STOPS } from "./tour";
import type { ModuleId } from "./types";

type Source = {
  mode: "tour" | "free";
  tourStep: number;
  focusedModuleId: ModuleId | null;
};

export function getTargetExplode(s: Source): number {
  if (s.mode === "tour") {
    return TOUR_STOPS[s.tourStep]?.explode ?? 0;
  }
  if (s.focusedModuleId === "rack") return 0.55;
  if (s.focusedModuleId === "node") return 1.0;
  return 0;
}

export function getTargetNodeSlide(s: Source): number {
  if (s.mode === "tour" && TOUR_STOPS[s.tourStep]?.id === "node") return 1;
  if (s.focusedModuleId === "node") return 1;
  return 0;
}
