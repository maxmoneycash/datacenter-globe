'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Activity } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { geoCentroid } from 'd3-geo';
import Globe from './Globe';
import Legend from './Legend';
import FpsCounter from './FpsCounter';
import CountryPanel from './CountryPanel';
import FilterHUD from './FilterHUD';
import SearchBox from './SearchBox';
import NearestPanel from './NearestPanel';
import { useIsMobile } from './useIsMobile';
import { classifyHyperscaler, type Hyperscaler } from './hyperscalers';
import type { CloudProvider } from './cloudRegions';
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

  // Layer toggles + filters (all stored as Sets so the component diff is cheap)
  const [showCables, setShowCables] = useState(false);
  const [shownClouds, setShownClouds] = useState<Set<CloudProvider>>(new Set());
  const [hyperscalerFilter, setHyperscalerFilter] = useState<Exclude<Hyperscaler, null> | null>(null);
  const [cables, setCables] = useState<any>(null);
  // When something in search / nearest panel sets a "pending" datacenter,
  // the CountryPanel auto-selects it after the country view opens.
  const [pendingSelectDc, setPendingSelectDc] = useState<Datacenter | null>(null);

  // Imperative handle to the underlying three-globe instance, exposed by
  // the Globe component via onGlobeReady. Used for cinematic camera moves.
  const globeInstanceRef = useRef<any>(null);
  // Default camera POV — used to restore the globe view when leaving a country.
  const defaultPovRef = useRef<{ lat: number; lng: number; altitude: number } | null>(null);

  const ZOOM_IN_MS = 900;
  const ZOOM_OUT_MS = 700;
  const COUNTRY_ALTITUDE = 0.55; // smaller = closer to country surface

  // Compute a country's centroid from its GeoJSON feature so we know where to fly.
  const countryCentroid = useCallback(
    (name: string): { lat: number; lng: number } | null => {
      if (!countries?.features) return null;
      const feature = countries.features.find((f: any) => {
        const raw =
          f.properties?.ADMIN || f.properties?.NAME || f.properties?.name || f.properties?.admin || '';
        return raw === name;
      });
      if (!feature) return null;
      const [lng, lat] = geoCentroid(feature) as [number, number];
      return { lat, lng };
    },
    [countries]
  );

  // Click a country → fly camera to its centroid + zoom in, THEN mount the
  // country panel. The 100ms head-start makes the camera move feel cinematic.
  const handleCountryClick = useCallback(
    (name: string) => {
      const cent = countryCentroid(name);
      const globe = globeInstanceRef.current;
      if (globe && cent) {
        // Snapshot the resting POV exactly once so we know where to fly back.
        if (!defaultPovRef.current && globe.pointOfView) {
          defaultPovRef.current = globe.pointOfView();
        }
        globe.pointOfView({ lat: cent.lat, lng: cent.lng, altitude: COUNTRY_ALTITUDE }, ZOOM_IN_MS);
      }
      // Mount the country panel ~90% of the way through the camera move so the
      // panel fade-in finishes just as the camera arrives — feels like one motion.
      window.setTimeout(() => setSelectedCountry(name), Math.round(ZOOM_IN_MS * 0.85));
    },
    [countryCentroid]
  );

  // Close → fade out the panel AND fly the camera back, in parallel.
  const handleCountryClose = useCallback(() => {
    setSelectedCountry(null);
    setPendingSelectDc(null);
    const globe = globeInstanceRef.current;
    const home = defaultPovRef.current;
    if (globe && home) {
      globe.pointOfView(home, ZOOM_OUT_MS);
    }
  }, []);

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
        // Tag each record with its hyperscaler at load time so downstream
        // components don't redo the classification on every render.
        const tagged: Datacenter[] = (dc as Datacenter[])
          .filter(
            (d) =>
              d.city_coords &&
              d.city_coords.length === 2 &&
              typeof d.city_coords[0] === 'number' &&
              typeof d.city_coords[1] === 'number'
          )
          .map((d) => ({ ...d, hyperscaler: classifyHyperscaler(d.company) }));
        setDatacenters(tagged);
        setCountries(geo);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load datacenter data.');
        setLoading(false);
      });
  }, []);

  // Lazy-load 1.5MB cables file only when the user first turns the layer on.
  useEffect(() => {
    if (!showCables || cables) return;
    fetch('/cables.json')
      .then((r) => r.json())
      .then(setCables)
      .catch((err) => console.error('Failed to load cables', err));
  }, [showCables, cables]);

  // Apply hyperscaler filter — produces the dataset shown on the globe + map.
  const visibleDatacenters = useMemo(() => {
    if (!hyperscalerFilter) return datacenters;
    return datacenters.filter((d) => d.hyperscaler === hyperscalerFilter);
  }, [datacenters, hyperscalerFilter]);

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
    <div className="relative w-full h-screen bg-[#0c0c0e] overflow-hidden text-white">
      <Globe
        datacenters={visibleDatacenters}
        countryStats={countryStats}
        onCountryClick={handleCountryClick}
        isPaused={!!selectedCountry}
        onBackgroundClick={() => {}}
        selectedCountryName={selectedCountry}
        cables={showCables ? cables : null}
        shownClouds={shownClouds}
        hyperscalerFilter={hyperscalerFilter}
        onGlobeReady={(g) => {
          globeInstanceRef.current = g;
        }}
      />

      {/* HUD header — compact single-line on mobile, sits above safe-area */}
      <div
        className={`absolute top-0 left-0 w-full pointer-events-none flex justify-between items-start z-10 ${
          isMobile ? 'px-3' : 'p-6'
        }`}
        style={isMobile ? { paddingTop: 'calc(env(safe-area-inset-top) + 8px)' } : undefined}
      >
        <div className={isMobile ? 'flex items-center gap-2' : ''}>
          <h1
            className={`${isMobile ? 'text-[15px]' : 'text-4xl'} font-thin tracking-tighter text-white drop-shadow-lg`}
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            <span className="font-bold" style={{ color: '#ff9f43' }}>DATACENTERS</span>
          </h1>
          {!isMobile && (
            <div
              className="flex items-center gap-1.5 mt-2 text-sm px-3 py-1 text-gray-400 bg-[#0c0c0e]/60 rounded-full backdrop-blur-sm border border-white/10 w-fit pointer-events-auto"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              <Activity size={14} className="animate-pulse" style={{ color: '#ff4d4d' }} />
              <span>
                {loading
                  ? 'INITIALIZING DATA…'
                  : 'LATEST AVAILABLE DATA: GLOBAL DATA CENTER REGISTRY'}
              </span>
            </div>
          )}
          {isMobile && !loading && (
            <span
              className="text-[10px] text-white/55 tabular-nums"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {totalSites.toLocaleString()} · {totalCountries}
            </span>
          )}
        </div>

        {!isMobile && (
          <div className="pointer-events-auto">
            <FpsCounter />
          </div>
        )}
      </div>

      {/* Legend hidden on mobile — too crowded. Stats shown in header instead. */}
      {!isMobile && <Legend totalSites={totalSites} totalCountries={totalCountries} />}

      {/* Search box (top-center) and "Closest to me" (top-left) */}
      {!loading && !selectedCountry && (
        <>
          <SearchBox
            datacenters={datacenters}
            isMobile={isMobile}
            onSelectCountry={handleCountryClick}
            onSelectDatacenter={(dc) => setPendingSelectDc(dc)}
          />
          <NearestPanel
            datacenters={datacenters}
            isMobile={isMobile}
            onSelectCountry={handleCountryClick}
            onSelectDatacenter={(dc) => setPendingSelectDc(dc)}
          />
        </>
      )}

      {/* Filter HUD — toggleable layers + hyperscaler filter */}
      {!loading && !selectedCountry && (
        <FilterHUD
          isMobile={isMobile}
          showCables={showCables}
          onToggleCables={() => setShowCables((v) => !v)}
          shownClouds={shownClouds}
          onToggleCloud={(c) =>
            setShownClouds((prev) => {
              const next = new Set(prev);
              if (next.has(c)) next.delete(c);
              else next.add(c);
              return next;
            })
          }
          hyperscalerFilter={hyperscalerFilter}
          onSetHyperscaler={setHyperscalerFilter}
          visibleCount={visibleDatacenters.length}
          totalCount={datacenters.length}
        />
      )}

      {!isMobile && (
        <div
          className="absolute bottom-6 right-6 z-10 flex flex-col items-end gap-1 text-xs text-white/30 tracking-widest pointer-events-none select-none uppercase"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}
        >
          <span>Data Source: Ringmast4r / Global-Data-Center-Map</span>
          <span>DC Intelligence</span>
        </div>
      )}

      {/* Mobile-only hint — anchored to bottom safe area */}
      {isMobile && !loading && !selectedCountry && (
        <div
          className="absolute z-10 left-1/2 -translate-x-1/2 pointer-events-none uppercase tracking-widest text-[10px] text-white/45 text-center px-4"
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            bottom: 'calc(env(safe-area-inset-bottom) + 12px)',
          }}
        >
          Drag · pinch · tap
        </div>
      )}

      <AnimatePresence>
        {selectedCountry && !tourDc && (
          <CountryPanel
            countryName={selectedCountry}
            countries={countries}
            datacenters={datacenters}
            stat={countryStats.get(selectedCountry)}
            onClose={handleCountryClose}
            onEnterTour={(dc) => setTourDc(dc)}
            width={viewport.w}
            height={viewport.h}
            initialSelectedDc={pendingSelectDc}
            onConsumedInitialDc={() => setPendingSelectDc(null)}
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
        <div className="absolute inset-0 bg-[#0c0c0e] z-50 flex items-center justify-center">
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
