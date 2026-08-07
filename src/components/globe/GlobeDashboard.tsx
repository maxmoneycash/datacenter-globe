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
import { isApproximate } from './precision';
import { HUD_ACCENT, HUD_CHIP, HUD_MONO } from './hud';
import SearchBox from './SearchBox';
import NearestPanel from './NearestPanel';
import HyperscalerStats from './HyperscalerStats';
import { useIsMobile } from './useIsMobile';
import { classifyHyperscaler, HYPERSCALER_COLORS, type Hyperscaler } from './hyperscalers';
import type { CloudProvider } from './cloudRegions';
import type { PowerPlant } from './powerplants';
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
  const [showPlants, setShowPlants] = useState(false);
  // Region/country-centroid facilities are hidden until asked for — thousands
  // of them share one coordinate and would read as a hotspot that isn't there.
  const [showApproximate, setShowApproximate] = useState(false);
  const [powerPlants, setPowerPlants] = useState<PowerPlant[] | null>(null);
  // How many pins the current zoom level actually reveals — reported by the
  // globe's LOD loop so the legend can explain why the map looks sparse.
  const [lodVisible, setLodVisible] = useState(0);
  // When something in search / nearest panel sets a "pending" datacenter,
  // the CountryPanel auto-selects it after the country view opens.
  const [pendingSelectDc, setPendingSelectDc] = useState<Datacenter | null>(null);

  // Imperative handle to the underlying three-globe instance, exposed by
  // the Globe component via onGlobeReady. Used for cinematic camera moves.
  const globeInstanceRef = useRef<any>(null);
  // Default camera POV — used to restore the globe view when leaving a country.
  const defaultPovRef = useRef<{ lat: number; lng: number; altitude: number } | null>(null);

  const toggleCloud = useCallback((c: CloudProvider) => {
    setShownClouds((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }, []);

  // Stable identity: the globe's LOD effect depends on this callback, and a
  // fresh closure each render would restart the animation loop every frame.
  const handleLodChange = useCallback((visible: number) => setLodVisible(visible), []);

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
    // Borders are vendored locally rather than pulled from a third-party CDN,
    // and a borders failure must never take the facility data down with it —
    // the globe is still useful with points and no country fills.
    Promise.all([
      fetch('/datacenters.json').then((r) => r.json()),
      fetch('/countries-110m.geojson')
        .then((r) => r.json())
        .catch((err) => {
          console.error('Failed to load country borders', err);
          return { type: 'FeatureCollection', features: [] };
        }),
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

  // Lazy-load 3.3MB power plant database only when the user first turns it on.
  useEffect(() => {
    if (!showPlants || powerPlants) return;
    fetch('/powerplants.json')
      .then((r) => r.json())
      .then(setPowerPlants)
      .catch((err) => console.error('Failed to load power plants', err));
  }, [showPlants, powerPlants]);

  // Apply precision + hyperscaler filters — produces the dataset shown on the
  // globe and the country map.
  const visibleDatacenters = useMemo(() => {
    let out = datacenters;
    if (!showApproximate) out = out.filter((d) => !isApproximate(d.precision));
    if (hyperscalerFilter) out = out.filter((d) => d.hyperscaler === hyperscalerFilter);
    return out;
  }, [datacenters, hyperscalerFilter, showApproximate]);

  // How many facilities we can place accurately, regardless of other filters.
  const preciseSites = useMemo(
    () => datacenters.filter((d) => !isApproximate(d.precision)).length,
    [datacenters]
  );

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
        powerPlants={showPlants ? powerPlants : null}
        shownClouds={shownClouds}
        hyperscalerFilter={hyperscalerFilter}
        onGlobeReady={(g) => {
          globeInstanceRef.current = g;
        }}
        onLodChange={handleLodChange}
      />

      {/*
        One overlay owns every floating panel. Panels are placed into four
        rails — two across the top, two across the bottom — instead of each
        component absolutely positioning itself, which is what previously let
        the hyperscaler card land on top of the legend and the FPS chip land
        under the Layers button. Flex gaps guarantee the separation now.
        The overlay ignores pointer events; each panel opts back in.
      */}
      <div
        className={`absolute inset-0 z-20 pointer-events-none flex flex-col ${
          isMobile ? 'px-3 pb-3' : 'p-6'
        }`}
        style={
          isMobile
            ? {
                paddingTop: 'calc(env(safe-area-inset-top) + 8px)',
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)',
              }
            : undefined
        }
      >
        {/* ── Top rails ─────────────────────────────────────────────────── */}
        <div className={`flex items-start gap-4 ${isMobile ? 'flex-col' : 'justify-between'}`}>
          {/* Top-left: identity + live counts + geolocation */}
          <div
            className={`flex ${isMobile ? 'flex-row items-center gap-2' : 'flex-col items-start gap-2'}`}
          >
            <h1
              className={`${
                isMobile ? 'text-[15px]' : 'text-3xl'
              } font-thin tracking-tighter text-white drop-shadow-lg`}
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              {!isMobile && 'GLOBAL '}
              <span className="font-bold" style={{ color: HUD_ACCENT }}>
                DATACENTERS
              </span>
            </h1>
            {!isMobile && (
              <div
                className={`flex items-center gap-1.5 text-xs px-3 py-1 text-gray-400 w-fit pointer-events-auto ${HUD_CHIP}`}
                style={{ fontFamily: HUD_MONO }}
              >
                <Activity size={12} className="animate-pulse" style={{ color: '#ff4d4d' }} />
                <span>
                  {loading
                    ? 'INITIALIZING DATA…'
                    : `${totalSites.toLocaleString()} SITES · ${totalCountries} COUNTRIES`}
                </span>
              </div>
            )}
            {isMobile && !loading && (
              <span
                className="text-[10px] text-white/55 tabular-nums"
                style={{ fontFamily: HUD_MONO }}
              >
                {totalSites.toLocaleString()} · {totalCountries}
              </span>
            )}
            {/* Desktop only — on mobile this chip lives in the bottom rail so
                it never sits under the search dropdown. */}
            {!isMobile && !loading && !selectedCountry && (
              <NearestPanel
                datacenters={datacenters}
                isMobile={isMobile}
                onSelectCountry={handleCountryClick}
                onSelectDatacenter={(dc) => setPendingSelectDc(dc)}
              />
            )}
          </div>

          {/* Top-centre: search. Capped so it can never grow into either rail. */}
          {!loading && !selectedCountry && (
            <div
              className={isMobile ? 'w-full' : 'flex-1 min-w-0 max-w-[380px] mt-1'}
              style={isMobile ? undefined : { marginLeft: 'auto', marginRight: 'auto' }}
            >
              <SearchBox
                datacenters={datacenters}
                isMobile={isMobile}
                onSelectCountry={handleCountryClick}
                onSelectDatacenter={(dc) => setPendingSelectDc(dc)}
              />
            </div>
          )}

          {/* Top-right: perf readout above the layer controls */}
          {!isMobile && (
            <div className="flex flex-col items-end gap-2">
              <div className="pointer-events-auto">
                <FpsCounter />
              </div>
              {!loading && !selectedCountry && (
                <FilterHUD
                  isMobile={isMobile}
                  showCables={showCables}
                  onToggleCables={() => setShowCables((v) => !v)}
                  showPlants={showPlants}
                  onTogglePlants={() => setShowPlants((v) => !v)}
                  showApproximate={showApproximate}
                  onToggleApproximate={() => setShowApproximate((v) => !v)}
                  approximateCount={datacenters.length - preciseSites}
                  shownClouds={shownClouds}
                  onToggleCloud={toggleCloud}
                  hyperscalerFilter={hyperscalerFilter}
                  onSetHyperscaler={setHyperscalerFilter}
                  visibleCount={visibleDatacenters.length}
                  totalCount={datacenters.length}
                />
              )}
            </div>
          )}
        </div>

        {/* Elastic gap — keeps the bottom rails pinned to the bottom edge. */}
        <div className="flex-1 min-h-0" />

        {/* ── Bottom rails ──────────────────────────────────────────────── */}
        <div
          className={`flex gap-4 ${isMobile ? 'flex-col' : 'items-end justify-between'}`}
        >
          {/* Bottom-left: filter context stacked above the legend. Both are
              in one column, so the stats card pushes the legend up rather
              than covering it. */}
          <div
            className={`flex flex-col gap-3 ${
              isMobile ? 'w-full' : 'items-start max-h-[70vh] overflow-hidden'
            }`}
          >
            {!loading && !selectedCountry && hyperscalerFilter && (
              <HyperscalerStats
                hyperscaler={hyperscalerFilter}
                datacenters={visibleDatacenters}
                isMobile={isMobile}
              />
            )}
            {!isMobile && (
              <Legend
                totalSites={totalSites}
                totalCountries={totalCountries}
                preciseSites={preciseSites}
                visibleAtZoom={lodVisible}
                pinTotal={visibleDatacenters.length}
              />
            )}
          </div>

          {/* Bottom-right: attribution (desktop) / the two action chips (mobile) */}
          {isMobile ? (
            !loading &&
            !selectedCountry && (
              <div className="flex items-center justify-between gap-3 w-full">
                <NearestPanel
                  datacenters={datacenters}
                  isMobile={isMobile}
                  onSelectCountry={handleCountryClick}
                  onSelectDatacenter={(dc) => setPendingSelectDc(dc)}
                />
                <FilterHUD
                  isMobile={isMobile}
                  showCables={showCables}
                  onToggleCables={() => setShowCables((v) => !v)}
                  showPlants={showPlants}
                  onTogglePlants={() => setShowPlants((v) => !v)}
                  showApproximate={showApproximate}
                  onToggleApproximate={() => setShowApproximate((v) => !v)}
                  approximateCount={datacenters.length - preciseSites}
                  shownClouds={shownClouds}
                  onToggleCloud={toggleCloud}
                  hyperscalerFilter={hyperscalerFilter}
                  onSetHyperscaler={setHyperscalerFilter}
                  visibleCount={visibleDatacenters.length}
                  totalCount={datacenters.length}
                />
              </div>
            )
          ) : (
            <div
              className="flex flex-col items-end gap-1 text-[11px] text-white/30 tracking-widest select-none uppercase"
              style={{ fontFamily: HUD_MONO }}
            >
              <span>Data centers © Ringmast4r / Global-Data-Center-Map</span>
              <span>Geocoding © GeoNames (CC BY 4.0)</span>
              <span>DC Intelligence</span>
            </div>
          )}
        </div>
      </div>

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
            cables={showCables ? cables : null}
            powerPlants={showPlants ? powerPlants : null}
            shownClouds={shownClouds as unknown as Set<string>}
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
