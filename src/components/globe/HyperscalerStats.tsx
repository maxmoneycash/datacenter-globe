'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Building2, Globe2, Zap } from 'lucide-react';
import { HYPERSCALER_COLORS, type Hyperscaler } from './hyperscalers';
import type { Datacenter } from './types';

interface Props {
  hyperscaler: Exclude<Hyperscaler, null>;
  datacenters: Datacenter[];
  isMobile: boolean;
}

const HyperscalerStats: React.FC<Props> = ({ hyperscaler, datacenters, isMobile }) => {
  const stats = useMemo(() => {
    const total = datacenters.length;
    const countries = new Set(datacenters.map((d) => d.country)).size;
    let totalMw = 0;
    let mwSites = 0;
    let operational = 0;
    let planned = 0;
    const cityCounts = new Map<string, number>();
    for (const dc of datacenters) {
      if (dc.mw_current != null) {
        totalMw += dc.mw_current;
        mwSites++;
      }
      if (dc.status === 'operational') operational++;
      else if (dc.status && dc.status !== 'operational') planned++;
      if (dc.city) cityCounts.set(dc.city, (cityCounts.get(dc.city) || 0) + 1);
    }
    const topCities = [...cityCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([city, n]) => ({ city, n }));
    return { total, countries, totalMw, mwSites, operational, planned, topCities };
  }, [datacenters]);

  const color = HYPERSCALER_COLORS[hyperscaler];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={`absolute z-20 pointer-events-auto bg-[#0c0c0e]/92 backdrop-blur-xl border rounded-xl shadow-2xl ${
        isMobile ? 'left-3 right-3 px-4 py-3' : 'left-6 bottom-6 px-5 py-4'
      }`}
      style={{
        borderColor: `${color}40`,
        width: isMobile ? undefined : 280,
        bottom: isMobile ? 'calc(env(safe-area-inset-bottom) + 12px)' : undefined,
        fontFamily: 'JetBrains Mono, monospace',
      }}
    >
      <div
        className="text-[10px] uppercase tracking-widest flex items-center gap-2 mb-2"
        style={{ color }}
      >
        <span
          className="inline-block w-2 h-2 rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
        />
        {hyperscaler} · Global Footprint
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <Stat icon={<Building2 size={11} />} label="Sites" value={stats.total.toLocaleString()} />
        <Stat icon={<Globe2 size={11} />} label="Countries" value={stats.countries.toString()} />
        <Stat
          icon={<Zap size={11} />}
          label="MW (known)"
          value={stats.totalMw > 0 ? Math.round(stats.totalMw).toLocaleString() : '—'}
          sub={stats.mwSites > 0 ? `${stats.mwSites} sites` : undefined}
        />
      </div>
      {stats.topCities.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/5">
          <div className="text-[9px] uppercase tracking-widest text-white/35 mb-1">
            Top Cities
          </div>
          <div className="flex flex-wrap gap-1.5">
            {stats.topCities.map((c) => (
              <span
                key={c.city}
                className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-white/75"
              >
                {c.city} <span className="text-white/40">·</span>{' '}
                <span style={{ color }}>{c.n}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

interface StatProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}
const Stat: React.FC<StatProps> = ({ icon, label, value, sub }) => (
  <div>
    <div className="text-[9px] text-white/40 uppercase tracking-widest flex items-center gap-1">
      {icon} {label}
    </div>
    <div className="text-[15px] font-semibold text-white tabular-nums leading-tight mt-0.5">
      {value}
    </div>
    {sub && <div className="text-[9px] text-white/35">{sub}</div>}
  </div>
);

export default HyperscalerStats;
