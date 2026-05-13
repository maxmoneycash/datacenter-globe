'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Activity } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Globe from './Globe';
import Legend from './Legend';
import FpsCounter from './FpsCounter';
import CountryPanel from './CountryPanel';
import { useIsMobile } from './useIsMobile';
import type { Datacenter, CountryStat } from './types';

const TourApp = dynamic(() => import('@/src/tour/TourApp'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-[#07090d]">
      <p className="text-xs uppercase tracking-widest text-white/50 animate-pulse">
        Loading datacenter tour…
      </p>
    </div>
  ),
});

const GlobeDashboard: React.FC = () => {
  const [datacenters, setDatacenters] = useState<Datacenter[]>([]);
  const [countries, setCountries] = useState<any>({ features: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [tourDc, setTourDc] = useState<Datacenter | null>(null);
  const [viewport, setViewport] = useState({ w: 1440, h: 900 });
  const isMobile = useIsMobile();

  useEffect(() => {
    setViewport({ w: window.innerWidth, h: window.innerHeight });
    const handle = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/datacenters.json').then((r) => r.json()),
      fetch('https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson').then((r) => r.json()),
    ])
      .then(([dc, geo]) => {
        const filtered = (dc as Datacenter[]).filter(
          (d) =>
            d.city_coords &&
            d.city_coords.length === 2 &&
            typeof d.city_coords[0] === 'number' &&
            typeof d.city_coords[1] === 'number'
        );
        setDatacenters(filtered);
        setCountries(geo);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load datacenter data.');
        setLoading(false);
      });
  }, []);

  const countryStats = useMemo<Map<string, CountryStat>>(() => {
    const byCountry = new Map<string, Datacenter[]>();
    for (const dc of datacenters) {
      if (!dc.country) continue;
      if (!byCountry.has(dc.country)) byCountry.set(dc.country, []);
      byCountry.get(dc.country)!.push(dc);
    }
    const stats = new Map<string, CountryStat>();
    for (const [country, dcs] of byCountry) {
      const companies = new Map<string, number>();
      for (const dc of dcs) companies.set(dc.company, (companies.get(dc.company) || 0) + 1);
      const topCompanies = [...companies.entries()]
        .map(([company, count]) => ({ company, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      stats.set(country, { country, count: dcs.length, topCompanies });
    }
    return stats;
  }, [datacenters]);

  const totalSites = datacenters.length;
  const totalCountries = countryStats.size;

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden text-white">
      <Globe
        datacenters={datacenters}
        countryStats={countryStats}
        onCountryClick={(name) => setSelectedCountry(name)}
        isPaused={!!selectedCountry}
        onBackgroundClick={() => {}}
        selectedCountryName={selectedCountry}
      />

      {/* HUD header — condensed on mobile so it doesn't overlap the globe */}
      <div
        className={`absolute top-0 left-0 w-full pointer-events-none flex justify-between items-start z-10 ${
          isMobile ? 'p-3 pt-safe' : 'p-6'
        }`}
      >
        <div>
          <h1
            className={`${isMobile ? 'text-lg' : 'text-4xl'} font-thin tracking-tighter text-white drop-shadow-lg`}
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            GLOBAL <span className="font-bold" style={{ color: '#ff9f43' }}>DATACENTERS</span>
          </h1>
          <div
            className={`flex items-center gap-1.5 mt-1 ${
              isMobile ? 'text-[9px] px-2 py-0.5' : 'text-sm mt-2 px-3 py-1'
            } text-gray-400 bg-black/40 rounded-full backdrop-blur-sm border border-white/10 w-fit pointer-events-auto`}
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            <Activity size={isMobile ? 10 : 14} className="animate-pulse" style={{ color: '#ff4d4d' }} />
            <span>
              {loading
                ? 'INITIALIZING DATA…'
                : isMobile
                ? `${totalSites.toLocaleString()} SITES · ${totalCountries} COUNTRIES`
                : 'LATEST AVAILABLE DATA: GLOBAL DATA CENTER REGISTRY'}
            </span>
          </div>
        </div>

        {!isMobile && (
          <div className="pointer-events-auto">
            <FpsCounter />
          </div>
        )}
      </div>

      {/* Legend hidden on mobile — too crowded. Stats shown in header instead. */}
      {!isMobile && <Legend totalSites={totalSites} totalCountries={totalCountries} />}

      {!isMobile && (
        <div
          className="absolute bottom-6 right-6 z-10 flex flex-col items-end gap-1 text-xs text-white/30 tracking-widest pointer-events-none select-none uppercase"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          <span>Data Source: Ringmast4r / Global-Data-Center-Map</span>
          <span>DC Intelligence</span>
        </div>
      )}

      {/* Mobile-only hint: how to interact */}
      {isMobile && !loading && !selectedCountry && (
        <div
          className="absolute z-10 left-1/2 -translate-x-1/2 bottom-safe mb-3 pointer-events-none uppercase tracking-widest text-[9px] text-white/45"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          Drag to rotate · pinch to zoom · tap a country
        </div>
      )}

      <AnimatePresence>
        {selectedCountry && !tourDc && (
          <CountryPanel
            countryName={selectedCountry}
            countries={countries}
            datacenters={datacenters}
            stat={countryStats.get(selectedCountry)}
            onClose={() => setSelectedCountry(null)}
            onEnterTour={(dc) => setTourDc(dc)}
            width={viewport.w}
            height={viewport.h}
          />
        )}
      </AnimatePresence>

      {/* 3D datacenter tour — full-screen overlay with cinematic transition */}
      <AnimatePresence>
        {tourDc && (
          <motion.div
            key="tour"
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 z-40"
          >
            <TourApp
              datacenter={{
                name: tourDc.name,
                company: tourDc.company,
                country: tourDc.country,
              }}
              onClose={() => setTourDc(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="absolute inset-0 bg-black z-50 flex items-center justify-center">
          <div className="text-center">
            <div
              className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4"
              style={{ borderColor: '#ff9f43', borderTopColor: 'transparent' }}
            />
            <p className="animate-pulse tracking-widest" style={{ color: '#ff9f43', fontFamily: 'JetBrains Mono, monospace' }}>
              LOADING DATACENTER TELEMETRY…
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-red-900/80 text-white px-6 py-3 rounded border border-red-500 text-sm z-50" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default GlobeDashboard;
