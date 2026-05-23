'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe2, Building2, MapPin, X } from 'lucide-react';
import { classifyHyperscaler, HYPERSCALER_COLORS, type Hyperscaler } from './hyperscalers';
import type { Datacenter } from './types';

type Result =
  | { kind: 'country'; name: string; count: number }
  | { kind: 'operator'; name: string; count: number; hyperscaler: Hyperscaler }
  | { kind: 'dc'; dc: Datacenter };

interface Props {
  datacenters: Datacenter[];
  isMobile: boolean;
  onSelectCountry: (name: string) => void;
  onSelectDatacenter: (dc: Datacenter) => void;
}

const SearchBox: React.FC<Props> = ({
  datacenters,
  isMobile,
  onSelectCountry,
  onSelectDatacenter,
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pre-built searchable index: countries + unique operators + every DC.
  // Lowercased once at build time. ~18k entries — substring match is ~5ms.
  const index = useMemo(() => {
    const countries = new Map<string, number>();
    const operators = new Map<string, number>();
    for (const dc of datacenters) {
      if (dc.country) countries.set(dc.country, (countries.get(dc.country) || 0) + 1);
      if (dc.company) operators.set(dc.company, (operators.get(dc.company) || 0) + 1);
    }
    return {
      countries: Array.from(countries.entries()).map(([name, count]) => ({
        name,
        lower: name.toLowerCase(),
        count,
      })),
      operators: Array.from(operators.entries()).map(([name, count]) => ({
        name,
        lower: name.toLowerCase(),
        count,
        hyperscaler: classifyHyperscaler(name),
      })),
      datacenters: datacenters.map((dc, i) => ({
        i,
        dc,
        lower: `${dc.name} ${dc.city || ''}`.toLowerCase(),
      })),
    };
  }, [datacenters]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const out: Result[] = [];
    for (const c of index.countries) {
      if (c.lower.includes(q)) out.push({ kind: 'country', name: c.name, count: c.count });
      if (out.length >= 4) break;
    }
    for (const op of index.operators) {
      if (op.lower.includes(q))
        out.push({
          kind: 'operator',
          name: op.name,
          count: op.count,
          hyperscaler: op.hyperscaler,
        });
      if (out.length >= 8) break;
    }
    for (const d of index.datacenters) {
      if (d.lower.includes(q)) out.push({ kind: 'dc', dc: d.dc });
      if (out.length >= 14) break;
    }
    return out;
  }, [query, index]);

  // Cmd+K / Ctrl+K to focus the input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handlePick = (r: Result) => {
    if (r.kind === 'country') onSelectCountry(r.name);
    if (r.kind === 'dc') {
      // Open the country view; the user can then click the specific DC.
      onSelectCountry(r.dc.country);
      onSelectDatacenter(r.dc);
    }
    if (r.kind === 'operator') {
      // Find first DC of that operator and open its country.
      const dc = datacenters.find((d) => d.company === r.name);
      if (dc) onSelectCountry(dc.country);
    }
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div
      className={`absolute z-20 pointer-events-auto ${
        isMobile ? 'top-3 left-3 right-[88px] pt-safe' : 'top-6 left-1/2 -translate-x-1/2'
      }`}
      style={{
        ...(isMobile ? { marginTop: 'env(safe-area-inset-top)' } : { width: 380 }),
      }}
    >
      <div
        className="flex items-center gap-2 bg-[#0c0c0e]/85 backdrop-blur-md border border-white/15 rounded-full px-3 py-1.5"
        style={{ fontFamily: 'JetBrains Mono, monospace' }}
      >
        <Search size={14} className="text-white/55 flex-shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={isMobile ? 'Search…' : 'Search country, operator, or site… (⌘K)'}
          className="flex-1 bg-transparent outline-none text-[12px] text-white placeholder:text-white/35"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="text-white/45 hover:text-white"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.14 }}
            className="absolute left-0 right-0 mt-2 bg-[#0c0c0e]/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl overflow-hidden max-h-[60vh] overflow-y-auto"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {results.map((r, i) => {
              const isCountry = r.kind === 'country';
              const isOp = r.kind === 'operator';
              const Icon = isCountry ? Globe2 : isOp ? Building2 : MapPin;
              const tagColor = isOp && r.hyperscaler ? HYPERSCALER_COLORS[r.hyperscaler] : null;
              return (
                <button
                  key={i}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handlePick(r)}
                  className="w-full text-left px-3 py-2.5 border-b border-white/5 hover:bg-white/[0.04] flex items-center gap-3 transition-colors"
                >
                  <Icon size={14} className="flex-shrink-0" style={{ color: tagColor ?? '#ff9f43' }} />
                  <div className="flex-1 min-w-0">
                    {r.kind === 'country' && (
                      <>
                        <div className="text-[12px] text-white truncate">{r.name}</div>
                        <div className="text-[10px] text-white/45">
                          {r.count.toLocaleString()} datacenters · country
                        </div>
                      </>
                    )}
                    {r.kind === 'operator' && (
                      <>
                        <div className="text-[12px] text-white truncate">{r.name}</div>
                        <div className="text-[10px] text-white/45 truncate">
                          {r.count.toLocaleString()} sites · operator
                          {r.hyperscaler && (
                            <span style={{ color: HYPERSCALER_COLORS[r.hyperscaler] }}>
                              {' · '}
                              {r.hyperscaler}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                    {r.kind === 'dc' && (
                      <>
                        <div className="text-[12px] text-white truncate">{r.dc.name}</div>
                        <div className="text-[10px] text-white/45 truncate">
                          <span className="text-[#facc15]">{r.dc.company}</span>
                          {r.dc.city && (
                            <>
                              {' · '}
                              {[r.dc.city, r.dc.country].filter(Boolean).join(', ')}
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
            {results.length === 14 && (
              <div className="px-3 py-2 text-[10px] text-white/40 border-t border-white/5">
                Type more to narrow…
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click-away to close */}
      {open && (
        <div
          className="fixed inset-0 -z-10"
          onClick={() => setOpen(false)}
          style={{ pointerEvents: open ? 'auto' : 'none' }}
        />
      )}
    </div>
  );
};

export default SearchBox;
