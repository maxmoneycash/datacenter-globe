"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Info, ShieldCheck } from "lucide-react";
import { useAppStore } from "@tour/lib/store";
import { TOUR_STOPS } from "@tour/lib/tour";
import { getStopMeta } from "@tour/lib/stops";
import { getUi } from "@tour/lib/i18n/ui";
import { getTourCaption } from "@tour/lib/i18n/captions";
import { formatTourStopLine } from "@tour/lib/i18n/format";
import { ColorChip } from "./ColorChip";

export function Caption() {
  const mode = useAppStore((s) => s.mode);
  const tourStep = useAppStore((s) => s.tourStep);
  const introDismissed = useAppStore((s) => s.hasIntroDismissed);
  const layerPanelOpen = useAppStore((s) => s.layerPanelOpen);
  const toggleLayerPanel = useAppStore((s) => s.toggleLayerPanel);
  const locale = useAppStore((s) => s.locale);

  if (mode !== "tour" || !introDismissed) return null;

  const ui = getUi(locale);
  const stop = TOUR_STOPS[tourStep];
  const meta = getStopMeta(stop.id, locale);
  const isLayer = stop.kind === "layer";
  const chapterLabel = isLayer ? ui.chapterStack : ui.chapterBuilding;
  const captionText = getTourCaption(stop.id, locale);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 sm:bottom-28 z-20 flex justify-center px-4 sm:px-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={stop.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4 }}
          className="glass max-w-2xl rounded-2xl px-4 sm:px-6 py-3 sm:py-4 text-center"
        >
          <div className="mb-1.5 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.18em] text-white/55">
            <ColorChip colorKey={meta.colorKey} />
            <span>
              {formatTourStopLine(locale, tourStep, TOUR_STOPS.length)} ·{" "}
              {chapterLabel} · {meta.label}
            </span>
          </div>
          <p className="text-[15px] sm:text-base text-white leading-relaxed">
            {captionText}
          </p>
          {isLayer && (
            <button
              type="button"
              onClick={toggleLayerPanel}
              className="pointer-events-auto mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] text-white/85 hover:border-white/40 hover:text-white"
              aria-pressed={layerPanelOpen}
            >
              {layerPanelOpen ? <ShieldCheck size={12} /> : <Info size={12} />}
              {layerPanelOpen ? ui.layerPanelHide : ui.layerPanelShow}
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
