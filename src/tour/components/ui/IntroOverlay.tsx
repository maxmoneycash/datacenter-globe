"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Play, MousePointerClick } from "lucide-react";
import { useAppStore } from "@tour/lib/store";
import { getUi } from "@tour/lib/i18n/ui";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function IntroOverlay() {
  const dismissed = useAppStore((s) => s.hasIntroDismissed);
  const locale = useAppStore((s) => s.locale);
  const ui = getUi(locale);
  const startTour = useAppStore((s) => s.startTour);
  const setMode = useAppStore((s) => s.setMode);
  const dismiss = useAppStore((s) => s.dismissIntro);

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 z-40 flex items-center justify-center px-6"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80 backdrop-blur-sm" />
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 0.8, 0.32, 1] }}
            className="glass relative z-10 max-w-xl rounded-3xl px-8 py-9 text-center"
          >
            <div className="mb-5 flex justify-center">
              <LanguageSwitcher />
            </div>
            <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-white/55">
              {ui.introKicker}
            </p>
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">
              {ui.introTitleBefore}
              <span style={{ color: "var(--color-compute)" }}>AI</span>
              {ui.introTitleAfter}
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/65">
              {ui.introBody}
            </p>

            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={startTour}
                className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-white/90"
              >
                <Play size={14} />
                {ui.startTour}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("free");
                  dismiss();
                }}
                className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm text-white/85 hover:border-white/40 hover:text-white"
              >
                <MousePointerClick size={14} />
                {ui.exploreFree}
              </button>
            </div>

            <p className="mt-6 text-[11px] text-white/40">
              {ui.introTip}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
