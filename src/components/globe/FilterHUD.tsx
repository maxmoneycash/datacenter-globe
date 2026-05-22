'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Cable, Cloud, Building2, X } from 'lucide-react';
import { CLOUD_COLORS, type CloudProvider } from './cloudRegions';
import { HYPERSCALER_COLORS, HYPERSCALER_LIST, type Hyperscaler } from './hyperscalers';

interface Props {
  isMobile: boolean;
  showCables: boolean;
  onToggleCables: () => void;
  shownClouds: Set<CloudProvider>;
  onToggleCloud: (c: CloudProvider) => void;
  hyperscalerFilter: Exclude<Hyperscaler, null> | null;
  onSetHyperscaler: (h: Exclude<Hyperscaler, null> | null) => void;
  visibleCount: number;
  totalCount: number;
}

const CLOUD_LIST: CloudProvider[] = ['AWS', 'Azure', 'GCP'];

const FilterHUD: React.FC<Props> = ({
  isMobile,
  showCables,
  onToggleCables,
  shownClouds,
  onToggleCloud,
  hyperscalerFilter,
  onSetHyperscaler,
  visibleCount,
  totalCount,
}) => {
  const [open, setOpen] = useState(false);
  const activeCount =
    (showCables ? 1 : 0) + shownClouds.size + (hyperscalerFilter ? 1 : 0);

  return (
    <div
      className={`absolute z-20 pointer-events-auto ${
        isMobile ? 'top-3 right-3 pt-safe' : 'top-6 right-6'
      }`}
      style={isMobile ? { marginTop: 'env(safe-area-inset-top)' } : undefined}
    >
      {/* Compact chip — tap to expand */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-[#0c0c0e]/85 backdrop-blur-md border border-white/15 rounded-full px-3 py-1.5 text-xs font-mono uppercase tracking-widest text-white/85"
        whileTap={{ scale: 0.96 }}
        style={{ fontFamily: 'JetBrains Mono, monospace' }}
      >
        <Layers size={13} className="text-[#ff9f43]" />
        <span>Layers</span>
        {activeCount > 0 && (
          <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#ff9f43] text-black text-[9px] font-bold">
            {activeCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            className="absolute right-0 mt-2 bg-[#0c0c0e]/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl overflow-hidden"
            style={{
              width: isMobile ? 260 : 280,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {/* Submarine cables */}
            <div className="px-4 pt-3 pb-2 border-b border-white/5">
              <div className="text-[9px] uppercase tracking-widest text-white/40 mb-2">
                Network Layer
              </div>
              <Toggle
                icon={<Cable size={13} />}
                label="Submarine cables"
                count={650}
                active={showCables}
                color="#22d3ee"
                onClick={onToggleCables}
              />
            </div>

            {/* Public-cloud region overlays */}
            <div className="px-4 pt-3 pb-2 border-b border-white/5">
              <div className="text-[9px] uppercase tracking-widest text-white/40 mb-2">
                Public Cloud Regions
              </div>
              {CLOUD_LIST.map((c) => (
                <Toggle
                  key={c}
                  icon={<Cloud size={13} />}
                  label={c}
                  active={shownClouds.has(c)}
                  color={CLOUD_COLORS[c]}
                  onClick={() => onToggleCloud(c)}
                />
              ))}
            </div>

            {/* Hyperscaler filter — single-select */}
            <div className="px-4 pt-3 pb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] uppercase tracking-widest text-white/40">
                  Hyperscaler Filter
                </span>
                {hyperscalerFilter && (
                  <button
                    onClick={() => onSetHyperscaler(null)}
                    className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-[#ff9f43] hover:text-white transition-colors"
                  >
                    <X size={10} /> Clear
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1">
                {HYPERSCALER_LIST.map((h) => {
                  const active = hyperscalerFilter === h;
                  return (
                    <button
                      key={h}
                      onClick={() => onSetHyperscaler(active ? null : h)}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[10px] transition-colors text-left"
                      style={{
                        background: active ? `${HYPERSCALER_COLORS[h]}22` : 'transparent',
                        border: `1px solid ${active ? HYPERSCALER_COLORS[h] : 'rgba(255,255,255,0.08)'}`,
                        color: active ? HYPERSCALER_COLORS[h] : 'rgba(255,255,255,0.7)',
                      }}
                    >
                      <Building2 size={10} />
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-4 py-2 bg-white/[0.02] border-t border-white/5 text-[10px] text-white/55 flex justify-between">
              <span>{visibleCount.toLocaleString()}</span>
              <span className="text-white/30">of {totalCount.toLocaleString()} sites</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface ToggleProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active: boolean;
  color: string;
  onClick: () => void;
}

const Toggle: React.FC<ToggleProps> = ({ icon, label, count, active, color, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between py-1.5 px-2 -mx-2 rounded text-[11px] transition-colors hover:bg-white/5"
  >
    <span className="flex items-center gap-2" style={{ color: active ? color : 'rgba(255,255,255,0.75)' }}>
      {icon}
      {label}
      {count != null && <span className="text-white/35 ml-1">·&nbsp;{count.toLocaleString()}</span>}
    </span>
    <span
      className="w-7 h-4 rounded-full p-0.5 flex transition-colors"
      style={{ background: active ? color : 'rgba(255,255,255,0.12)' }}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 600, damping: 35 }}
        className="block w-3 h-3 rounded-full bg-white"
        style={{ marginLeft: active ? 'auto' : 0 }}
      />
    </span>
  </button>
);

export default FilterHUD;
