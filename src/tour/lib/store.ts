"use client";

import { create } from "zustand";
import type {
  AppMode,
  FlowAnimId,
  LayerId,
  ModuleId,
  TourPhase,
} from "./types";
import type { Locale } from "./i18n/locale";
import { LOCALE_STORAGE_KEY } from "./i18n/locale";
import { TOUR_STOPS } from "./tour";

type AnimTrigger = { id: FlowAnimId; nonce: number };

/**
 * Compute the new state when the camera is moved to a different tour stop.
 *
 * The verify side-panel rule:
 * - When entering Chapter 2 (the first layer stop) for the first time in the
 *   session, auto-open the panel once so the user can see what the layer
 *   system is showing them.
 * - On subsequent entries to layer stops, respect whatever the user last set.
 * - Whenever we land on a "module" (Chapter 1) stop, force the panel closed
 *   so the cinematic camera plays uncluttered.
 */
function transitionTo(
  s: {
    layerPanelOpen: boolean;
    chapter2Visited: boolean;
  },
  nextIndex: number,
): {
  tourStep: number;
  tourPhase: TourPhase;
  layerPanelOpen: boolean;
  chapter2Visited: boolean;
} {
  const stop = TOUR_STOPS[nextIndex];
  const enteringLayer = stop?.kind === "layer";
  const firstTimeIntoChapter2 = enteringLayer && !s.chapter2Visited;
  return {
    tourStep: nextIndex,
    tourPhase: "transition",
    layerPanelOpen: enteringLayer
      ? firstTimeIntoChapter2
        ? true
        : s.layerPanelOpen
      : false,
    chapter2Visited: s.chapter2Visited || enteringLayer,
  };
}

type AppState = {
  mode: AppMode;
  tourStep: number;
  tourPhase: TourPhase;
  isPlaying: boolean;

  focusedModuleId: ModuleId | null;
  detailOpen: boolean;
  /** Whether the verification side panel is open while the camera is on a layer stop. */
  layerPanelOpen: boolean;
  /** True after the user has entered Chapter 2 (the verifiable stack) at least once. */
  chapter2Visited: boolean;
  hasIntroDismissed: boolean;
  locale: Locale;

  activeAnims: Record<FlowAnimId, AnimTrigger | undefined>;

  setMode: (m: AppMode) => void;
  setLocale: (locale: Locale) => void;
  startTour: () => void;
  togglePlay: () => void;
  nextStop: () => void;
  prevStop: () => void;
  goToStop: (i: number) => void;
  setTourPhase: (p: TourPhase) => void;

  focusModule: (id: ModuleId | null) => void;
  openDetail: (id: ModuleId) => void;
  closeDetail: () => void;
  toggleLayerPanel: () => void;
  setLayerPanelOpen: (open: boolean) => void;
  dismissIntro: () => void;

  triggerAnim: (id: FlowAnimId) => void;
  triggerAnims: (ids: FlowAnimId[] | undefined) => void;
};

export const useAppStore = create<AppState>((set, get) => ({
  mode: "tour",
  tourStep: 0,
  tourPhase: "transition",
  isPlaying: false,
  focusedModuleId: null,
  detailOpen: false,
  layerPanelOpen: false,
  chapter2Visited: false,
  hasIntroDismissed: false,
  locale: "en",
  activeAnims: {
    coolantFlow: undefined,
    nvlinkPackets: undefined,
    fabricPackets: undefined,
    powerPulse: undefined,
  },

  setMode: (m) => {
    if (m === "free") {
      set({
        mode: "free",
        isPlaying: false,
        tourPhase: "paused",
        focusedModuleId: null,
        detailOpen: false,
      });
    } else {
      set({ mode: "tour", focusedModuleId: null, detailOpen: false });
    }
  },

  startTour: () => {
    set({
      mode: "tour",
      isPlaying: true,
      tourStep: 0,
      tourPhase: "transition",
      hasIntroDismissed: true,
    });
  },

  togglePlay: () => {
    const { isPlaying, tourPhase } = get();
    if (isPlaying) {
      set({ isPlaying: false, tourPhase: "paused" });
    } else {
      set({
        isPlaying: true,
        tourPhase: tourPhase === "paused" ? "dwell" : tourPhase,
      });
    }
  },

  nextStop: () => {
    const { tourStep } = get();
    const next = Math.min(TOUR_STOPS.length - 1, tourStep + 1);
    if (next === tourStep) return;
    set((s) => transitionTo(s, next));
  },

  prevStop: () => {
    const { tourStep } = get();
    const prev = Math.max(0, tourStep - 1);
    if (prev === tourStep) return;
    set((s) => transitionTo(s, prev));
  },

  goToStop: (i) => {
    const idx = Math.max(0, Math.min(TOUR_STOPS.length - 1, i));
    set((s) => transitionTo(s, idx));
  },

  setTourPhase: (p) => set({ tourPhase: p }),

  focusModule: (id) => set({ focusedModuleId: id }),

  openDetail: (id) =>
    set({
      focusedModuleId: id,
      detailOpen: true,
    }),

  closeDetail: () => set({ detailOpen: false, focusedModuleId: null }),

  toggleLayerPanel: () =>
    set((s) => ({ layerPanelOpen: !s.layerPanelOpen })),

  setLayerPanelOpen: (open) => set({ layerPanelOpen: open }),

  dismissIntro: () => set({ hasIntroDismissed: true }),

  setLocale: (locale) => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      } catch {
        /* ignore quota */
      }
    }
    set({ locale });
  },

  triggerAnim: (id) =>
    set((s) => ({
      activeAnims: {
        ...s.activeAnims,
        [id]: { id, nonce: (s.activeAnims[id]?.nonce ?? 0) + 1 },
      },
    })),

  triggerAnims: (ids) => {
    if (!ids || ids.length === 0) return;
    set((s) => {
      const next = { ...s.activeAnims };
      for (const id of ids) {
        next[id] = { id, nonce: (next[id]?.nonce ?? 0) + 1 };
      }
      return { activeAnims: next };
    });
  },
}));

/**
 * Derive the currently-active layer (if any). In tour mode this is the layer
 * id of the current stop; in free mode it stays null until we add a free-mode
 * layer toggle UI.
 */
export function useActiveLayerId(): LayerId | null {
  const mode = useAppStore((s) => s.mode);
  const tourStep = useAppStore((s) => s.tourStep);
  if (mode !== "tour") return null;
  const stop = TOUR_STOPS[tourStep];
  if (!stop || stop.kind !== "layer") return null;
  return stop.id as LayerId;
}
