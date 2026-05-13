"use client";

import { useAppStore } from "@tour/lib/store";
import { TOUR_STOPS } from "@tour/lib/tour";
import { getStopMeta } from "@tour/lib/stops";
import { getUi } from "@tour/lib/i18n/ui";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@tour/lib/utils";
import { ColorChip } from "./ColorChip";

export function TourControls() {
  const mode = useAppStore((s) => s.mode);
  const step = useAppStore((s) => s.tourStep);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const introDismissed = useAppStore((s) => s.hasIntroDismissed);
  const locale = useAppStore((s) => s.locale);
  const togglePlay = useAppStore((s) => s.togglePlay);
  const nextStop = useAppStore((s) => s.nextStop);
  const prevStop = useAppStore((s) => s.prevStop);
  const goToStop = useAppStore((s) => s.goToStop);
  const ui = getUi(locale);

  if (mode !== "tour" || !introDismissed) return null;

  const stop = TOUR_STOPS[step];
  const isLast = step === TOUR_STOPS.length - 1;
  const meta = getStopMeta(stop.id, locale);

  // Find the index where Chapter 2 starts (first layer stop). Used to draw a
  // visual divider in the dot strip so users can see they have moved from
  // building-tour to verifiable-stack.
  const chapter2Start = TOUR_STOPS.findIndex((s) => s.kind === "layer");

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center px-4">
      <div className="glass pointer-events-auto flex max-w-[min(96vw,1100px)] items-center gap-2 rounded-full p-1.5 shadow-2xl">
        <IconBtn
          aria-label={ui.ariaPrev}
          onClick={prevStop}
          disabled={step === 0}
        >
          <ChevronLeft size={16} />
        </IconBtn>
        <IconBtn
          aria-label={
            isLast && !isPlaying
              ? ui.ariaRestart
              : isPlaying
                ? ui.ariaPause
                : ui.ariaPlay
          }
          onClick={() => {
            if (isLast && !isPlaying) {
              goToStop(0);
              togglePlay();
            } else {
              togglePlay();
            }
          }}
          primary
        >
          {isLast && !isPlaying ? (
            <RotateCcw size={16} />
          ) : isPlaying ? (
            <Pause size={16} />
          ) : (
            <Play size={16} />
          )}
        </IconBtn>
        <IconBtn
          aria-label={ui.ariaNext}
          onClick={nextStop}
          disabled={isLast}
        >
          <ChevronRight size={16} />
        </IconBtn>

        <div className="mx-2 h-6 w-px bg-white/10" />

        <div className="flex min-w-0 items-center gap-1 overflow-x-auto px-1 sm:gap-1.5">
          {TOUR_STOPS.map((s, i) => {
            const m = getStopMeta(s.id, locale);
            const isActive = i === step;
            return (
              <div key={`${s.id}-${i}`} className="flex items-center">
                {i === chapter2Start && i > 0 ? (
                  <span
                    className="mx-1.5 inline-block h-3 w-px bg-white/15"
                    aria-hidden
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => goToStop(i)}
                  className="group flex items-center"
                  title={`${i + 1}. ${m.label}`}
                  aria-label={`${ui.ariaGoTo} ${m.label}`}
                >
                  <span
                    className={cn(
                      "block h-1.5 rounded-full transition-all",
                      isActive ? "w-5" : "w-1.5 group-hover:w-3",
                    )}
                    style={{
                      background: isActive
                        ? `var(--color-${m.colorKey})`
                        : "rgba(255,255,255,0.25)",
                      boxShadow: isActive
                        ? `0 0 10px var(--color-${m.colorKey})`
                        : "none",
                    }}
                  />
                </button>
              </div>
            );
          })}
        </div>

        <div className="hidden xl:flex shrink-0 items-center gap-2 px-3 py-1.5 text-[11px] text-white/70">
          <ColorChip colorKey={meta.colorKey} />
          <span className="uppercase tracking-wider">{meta.label}</span>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  primary,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/85 transition-colors",
        primary ? "bg-white text-black hover:bg-white/90" : "hover:bg-white/10",
        disabled && "opacity-40 cursor-not-allowed hover:bg-transparent",
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
