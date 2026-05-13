"use client";

import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { X, RotateCw, ArrowRight, Eye, Wand2, ShieldCheck } from "lucide-react";
import { useAppStore } from "@tour/lib/store";
import { MODULES } from "@tour/lib/modules";
import { LAYERS_BY_ID } from "@tour/lib/layers";
import { TOUR_STOPS } from "@tour/lib/tour";
import { getStopMeta } from "@tour/lib/stops";
import { getUi } from "@tour/lib/i18n/ui";
import type { LayerMeta, ModuleMeta, StopMeta } from "@tour/lib/types";
import { ColorChip } from "./ColorChip";
import { cn } from "@tour/lib/utils";

export function DetailPanel() {
  const mode = useAppStore((s) => s.mode);
  const open = useAppStore((s) => s.detailOpen);
  const layerPanelOpen = useAppStore((s) => s.layerPanelOpen);
  const focusedId = useAppStore((s) => s.focusedModuleId);
  const tourStep = useAppStore((s) => s.tourStep);
  const closeDetail = useAppStore((s) => s.closeDetail);
  const setLayerPanelOpen = useAppStore((s) => s.setLayerPanelOpen);
  const focusModule = useAppStore((s) => s.focusModule);
  const openDetail = useAppStore((s) => s.openDetail);
  const triggerAnim = useAppStore((s) => s.triggerAnim);
  const locale = useAppStore((s) => s.locale);
  const ui = getUi(locale);

  const dragControls = useDragControls();

  // Decide what to show. Two cases:
  //   1. Free mode + open detail → that module's panel.
  //   2. Tour mode on a "layer" stop AND user has opened the layer panel.
  let meta: StopMeta | null = null;
  let key = "";
  let kind: "free-module" | "tour-layer" = "free-module";

  if (mode === "free" && open && focusedId) {
    meta = getStopMeta(focusedId, locale);
    key = `free-${focusedId}`;
    kind = "free-module";
  } else if (mode === "tour" && layerPanelOpen) {
    const stop = TOUR_STOPS[tourStep];
    if (stop?.kind === "layer") {
      meta = getStopMeta(stop.id, locale);
      key = `tour-${stop.id}`;
      kind = "tour-layer";
    }
  }

  const visible = meta !== null;
  const handleClose =
    kind === "tour-layer" ? () => setLayerPanelOpen(false) : closeDetail;

  return (
    <AnimatePresence>
      {visible && meta ? (
        <motion.aside
          key={key}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.28, ease: [0.22, 0.8, 0.32, 1] }}
          drag
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0.08}
          dragConstraints={{ left: -340, right: 80, top: -48, bottom: 120 }}
          className="glass scrollbar-thin pointer-events-auto absolute right-3 left-3 sm:left-auto sm:right-5 top-20 bottom-32 sm:bottom-24 z-20 flex w-auto sm:w-full sm:max-w-sm flex-col overflow-y-auto rounded-2xl shadow-2xl"
        >
          <PanelHeader
            meta={meta}
            onClose={handleClose}
            ui={ui}
            onDragPointerDown={(e) => dragControls.start(e)}
          />

          <div className="flex-1 px-5 py-4 space-y-5">
            <p className="text-[15px] leading-relaxed text-white">
              {meta.metaphor}
            </p>

            <div className="grid grid-cols-1 gap-2 rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/5">
              {meta.facts.map((f) => (
                <div
                  key={f.label}
                  className="flex items-baseline justify-between gap-3 text-[13px]"
                >
                  <span className="text-white/55">{f.label}</span>
                  <span className="font-medium text-white text-right">
                    {f.value}
                  </span>
                </div>
              ))}
            </div>

            <p
              className="rounded-lg border-l-2 px-3 py-2 text-[13px] italic leading-relaxed text-white/85"
              style={{
                borderColor: `var(--color-${meta.colorKey})`,
                background: `color-mix(in srgb, var(--color-${meta.colorKey}) 10%, transparent)`,
              }}
            >
              {meta.comparison}
            </p>

            {meta.kind === "layer" ? <VerifyTriple meta={meta} ui={ui} /> : null}

            {meta.sections.map((s, i) => (
              <section key={i} className="space-y-1.5">
                {s.heading && (
                  <h3 className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                    {s.heading}
                  </h3>
                )}
                <p className="text-[13.5px] leading-relaxed text-white/80">
                  {s.body}
                </p>
              </section>
            ))}

            {meta.glossary && meta.glossary.length > 0 && (
              <section className="space-y-2 rounded-xl bg-white/[0.03] p-3 ring-1 ring-white/5">
                <h3 className="text-[11px] uppercase tracking-[0.16em] text-white/50">
                  {ui.detailGlossary}
                </h3>
                <dl className="space-y-1.5 text-[12.5px]">
                  {meta.glossary.map((g) => (
                    <div key={g.term}>
                      <dt className="font-medium text-white">{g.term}</dt>
                      <dd className="text-white/65">{g.def}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>

          {meta.kind === "module" ? (
            <PanelFooter
              meta={meta}
              ui={ui}
              onReplay={() => meta?.kind === "module" && meta.anim && triggerAnim(meta.anim)}
              onNext={() => {
                if (meta?.kind !== "module") return;
                const next = MODULES[(meta.index + 1) % MODULES.length];
                focusModule(next.id);
                openDetail(next.id);
                if (next.anim) triggerAnim(next.anim);
              }}
            />
          ) : null}
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

function PanelHeader({
  meta,
  onClose,
  ui,
  onDragPointerDown,
}: {
  meta: StopMeta;
  onClose: () => void;
  ui: ReturnType<typeof getUi>;
  onDragPointerDown: (e: React.PointerEvent) => void;
}) {
  const isLayer = meta.kind === "layer";
  const layerTotal = Object.keys(LAYERS_BY_ID).length;
  const subtitle = isLayer
    ? `${ui.category[(meta as LayerMeta).category]} · ${ui.detailLayerN} ${(meta as LayerMeta).index + 1} ${ui.detailOf} ${layerTotal}`
    : `${ui.detailModuleN} ${(meta as ModuleMeta).index + 1} ${ui.detailOf} ${MODULES.length}`;

  return (
    <div
      className="flex cursor-grab touch-none select-none items-center justify-between gap-2 border-b border-white/5 px-5 py-4 active:cursor-grabbing"
      onPointerDown={onDragPointerDown}
      title="Drag to reposition"
    >
      <div className="flex items-center gap-3">
        <ColorChip colorKey={meta.colorKey} />
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">
            {subtitle}
          </p>
          <h2 className="text-base font-semibold text-white">{meta.label}</h2>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isLayer && (
          <span
            className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-white/55"
            title={
              (meta as LayerMeta).attestable
                ? ui.detailAttestable
                : ui.detailSoft
            }
          >
            {(meta as LayerMeta).attestable
              ? ui.detailLayerBadgeAttest
              : ui.detailLayerBadgeSoft}
          </span>
        )}
        <button
          type="button"
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={ui.detailClose}
          className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function VerifyTriple({
  meta,
  ui,
}: {
  meta: LayerMeta;
  ui: ReturnType<typeof getUi>;
}) {
  const items: Array<{
    icon: React.ReactNode;
    label: string;
    body: string;
    accent: string;
  }> = [
    {
      icon: <Eye size={13} />,
      label: ui.detailWho,
      body: meta.whoCanSee,
      accent: "rgba(148,163,184,0.55)",
    },
    {
      icon: <Wand2 size={13} />,
      label: ui.detailFake,
      body: meta.howToFake,
      accent: "rgba(244,114,182,0.55)",
    },
    {
      icon: <ShieldCheck size={13} />,
      label: ui.detailVerify,
      body: meta.howToVerify,
      accent: "var(--color-verify)",
    },
  ];

  return (
    <section className="space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <h3 className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-white/55">
        {ui.detailVerificationTriple}
      </h3>
      <ul className="space-y-2.5">
        {items.map((it) => (
          <li key={it.label} className="flex gap-2.5">
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
              style={{
                background: `color-mix(in srgb, ${it.accent} 22%, transparent)`,
                color: it.accent,
              }}
            >
              {it.icon}
            </span>
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/50">
                {it.label}
              </p>
              <p className="text-[13px] leading-snug text-white/85">{it.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PanelFooter({
  meta,
  ui,
  onReplay,
  onNext,
}: {
  meta: ModuleMeta;
  ui: ReturnType<typeof getUi>;
  onReplay: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-white/5 px-5 py-3">
      {meta.anim ? (
        <button
          type="button"
          onClick={onReplay}
          className={cn(
            "flex items-center gap-2 rounded-full border border-white/15 px-3.5 py-1.5 text-[12px] text-white/85 hover:border-white/40 hover:text-white",
          )}
        >
          <RotateCw size={13} />
          {ui.detailReplay}
        </button>
      ) : (
        <span className="text-[11px] text-white/35">{ui.detailNoAnim}</span>
      )}
      <div className="flex-1" />
      <button
        type="button"
        onClick={onNext}
        className="flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-medium text-black hover:bg-white/90"
      >
        {ui.detailNext}
        <ArrowRight size={13} />
      </button>
    </div>
  );
}
