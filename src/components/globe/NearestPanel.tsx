'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation, X, Loader2 } from 'lucide-react';
import type { Datacenter } from './types';

interface Props {
  datacenters: Datacenter[];
  isMobile: boolean;
  onSelectCountry: (name: string) => void;
  onSelectDatacenter: (dc: Datacenter) => void;
}

// Haversine — distance in kilometers between two lat/lng pairs.
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const NearestPanel: React.FC<Props> = ({
  datacenters,
  isMobile,
  onSelectCountry,
  onSelectDatacenter,
}) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by this browser.');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
        setOpen(true);
      },
      (err) => {
        setError(err.code === 1 ? 'Location permission denied.' : 'Could not get location.');
        setLoading(false);
      },
      { timeout: 10000, maximumAge: 5 * 60_000 }
    );
  };

  const nearest = useMemo(() => {
    if (!coords) return [];
    return datacenters
      .filter((d) => d.city_coords)
      .map((d) => ({
        dc: d,
        km: haversineKm(coords.lat, coords.lng, d.city_coords![0], d.city_coords![1]),
      }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 10);
  }, [datacenters, coords]);

  return (
    <>
      {/* Trigger chip */}
      <div
        className={`absolute z-20 pointer-events-auto ${isMobile ? 'left-3' : 'top-6 left-6'}`}
        style={
          isMobile
            ? { top: 'calc(env(safe-area-inset-top) + 112px)' }
            : undefined
        }
      >
        <motion.button
          onClick={() => (coords ? setOpen((v) => !v) : requestLocation())}
          className={`flex items-center gap-2 bg-[#0c0c0e]/90 backdrop-blur-md border border-white/15 rounded-full font-mono uppercase tracking-widest text-white/85 ${
            isMobile ? 'px-4 py-2.5 text-[12px]' : 'px-3 py-1.5 text-xs'
          }`}
          whileTap={{ scale: 0.96 }}
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
          disabled={loading}
        >
          {loading ? (
            <Loader2 size={isMobile ? 15 : 13} className="text-[#ff9f43] animate-spin" />
          ) : (
            <Navigation size={isMobile ? 15 : 13} className="text-[#ff9f43]" />
          )}
          <span>{isMobile ? 'Near me' : 'Closest to me'}</span>
        </motion.button>
        {error && (
          <div
            className="mt-2 bg-red-900/40 border border-red-500/40 rounded px-2 py-1 text-[10px] text-red-200 max-w-[260px]"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Results panel */}
      <AnimatePresence>
        {open && coords && nearest.length > 0 && (
          <motion.div
            initial={isMobile ? { y: '100%' } : { opacity: 0, x: -10 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, x: 0 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, x: -10 }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className={`absolute z-40 bg-[#0c0c0e]/95 backdrop-blur-xl border border-white/15 shadow-2xl overflow-hidden pointer-events-auto ${
              isMobile
                ? 'left-0 right-0 bottom-0 rounded-t-2xl max-h-[70vh] overflow-y-auto pb-safe'
                : 'top-20 left-6 w-[340px] rounded-xl max-h-[70vh] overflow-y-auto'
            }`}
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {isMobile && (
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
            )}
            <div className="px-4 pt-3 pb-3 border-b border-white/10 flex justify-between items-start">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#ff9f43] flex items-center gap-1.5">
                  <Navigation size={11} /> Nearest datacenters
                </div>
                <div className="text-[10px] text-white/45 mt-0.5">
                  From {coords.lat.toFixed(2)}°, {coords.lng.toFixed(2)}°
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/45 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="divide-y divide-white/5">
              {nearest.map((entry, i) => (
                <button
                  key={`${entry.dc.name}-${i}`}
                  onClick={() => {
                    onSelectCountry(entry.dc.country);
                    onSelectDatacenter(entry.dc);
                    setOpen(false);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-white/[0.04] flex items-center gap-3 transition-colors"
                >
                  <div
                    className="flex flex-col items-center justify-center w-10 flex-shrink-0"
                    style={{ color: '#ff9f43' }}
                  >
                    <div className="text-[14px] font-bold leading-none">
                      {Math.round(entry.km).toLocaleString()}
                    </div>
                    <div className="text-[8px] uppercase tracking-widest text-white/45">km</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-white font-semibold truncate">
                      {entry.dc.name}
                    </div>
                    <div className="text-[10px] text-[#facc15] truncate">{entry.dc.company}</div>
                    <div className="text-[10px] text-white/45 truncate">
                      {[entry.dc.city, entry.dc.country].filter(Boolean).join(', ')}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NearestPanel;
