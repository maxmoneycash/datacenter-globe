import React, { useMemo, useState, useCallback, memo } from 'react';
import { X, MapPin, Building2, Box, Zap, ExternalLink } from 'lucide-react';
import { geoMercator, geoPath, geoArea } from 'd3-geo';
import { motion, AnimatePresence } from 'framer-motion';
import type { Datacenter, CountryStat } from './types';
import { normalizeCountry } from './constants';
import { useIsMobile } from './useIsMobile';

interface Props {
  countryName: string;
  countries: any;
  datacenters: Datacenter[];
  stat: CountryStat | undefined;
  onClose: () => void;
  onEnterTour?: (dc: Datacenter) => void;
  width: number;
  height: number;
}

// Reserve a fixed left column for the stats panel; the map takes the rest.
const LEFT_PANEL_WIDTH = 340;

// 📍 emoji markers — match the world-globe view.
const PIN_FONT_SIZE = 18;
const PIN_FONT_SIZE_HOVER = 26;

// Sidebar row — memoized so hovering or selecting one row doesn't re-render
// the other 2,000+ rows for a country like the United States.
interface SidebarRowProps {
  dc: Datacenter;
  isActive: boolean;
  isMobile: boolean;
  onHover: (dc: Datacenter) => void;
  onLeave: (dc: Datacenter) => void;
  onSelect: (dc: Datacenter) => void;
}

const SidebarRow = memo(function SidebarRow({
  dc,
  isActive,
  isMobile,
  onHover,
  onLeave,
  onSelect,
}: SidebarRowProps) {
  return (
    <button
      onClick={() => onSelect(dc)}
      onMouseEnter={() => onHover(dc)}
      onMouseLeave={() => onLeave(dc)}
      className={`w-full text-left border-b border-white/5 transition-colors ${
        isMobile ? 'px-4 py-2.5' : 'px-6 py-3'
      }`}
      style={{
        background: isActive ? 'rgba(255,159,67,0.10)' : 'transparent',
        borderLeft: isActive ? '2px solid #ff9f43' : '2px solid transparent',
      }}
    >
      <div className={`font-sans font-semibold leading-tight truncate ${isMobile ? 'text-[12px]' : 'text-[13px]'}`}>
        {dc.name}
      </div>
      <div className="font-mono text-[10px] text-[#facc15] mt-0.5 truncate">{dc.company}</div>
      <div className="font-mono text-[10px] text-white/45 mt-0.5 truncate">
        {[dc.city, dc.state].filter(Boolean).join(', ') || '—'}
      </div>
      {(dc.mw_current != null || dc.status) && (
        <div className="mt-1 flex items-center gap-2.5 font-mono text-[10px]">
          {dc.mw_current != null && (
            <span className="text-[#facc15]">
              ⚡ {dc.mw_current} MW
              {dc.mw_planned_max != null && dc.mw_planned_max !== dc.mw_current && (
                <span className="text-white/40"> / {dc.mw_planned_max}</span>
              )}
            </span>
          )}
          {dc.status && (
            <span className="flex items-center gap-1 text-white/55 uppercase tracking-widest">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: dc.status === 'operational' ? '#4ade80' : '#facc15' }}
              />
              {dc.status.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      )}
    </button>
  );
});

const CountryPanel: React.FC<Props> = ({
  countryName,
  countries,
  datacenters,
  stat,
  onClose,
  onEnterTour,
  width,
  height,
}) => {
  const [selectedDc, setSelectedDc] = useState<Datacenter | null>(null);
  const [hoverDc, setHoverDc] = useState<Datacenter | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  const feature = useMemo(() => {
    return countries.features.find((f: any) => {
      const raw =
        f.properties?.ADMIN || f.properties?.NAME || f.properties?.name || f.properties?.admin || '';
      return normalizeCountry(raw) === countryName;
    });
  }, [countries, countryName]);

  /**
   * For countries with far-flung territories (US has Alaska + Hawaii, France has
   * Réunion, etc.) the default bounding-box fit shrinks the main landmass into
   * a corner. Fit just the LARGEST polygon by spherical area so the contiguous
   * mainland dominates the view.
   */
  const projectionFeature = useMemo<any>(() => {
    if (!feature) return null;
    if (feature.geometry?.type === 'Polygon') return feature;
    if (feature.geometry?.type !== 'MultiPolygon') return feature;
    const polys: number[][][][] = feature.geometry.coordinates;
    let biggest = polys[0];
    let biggestArea = 0;
    for (const p of polys) {
      const single = { type: 'Polygon', coordinates: p } as GeoJSON.Polygon;
      const a = geoArea(single);
      if (a > biggestArea) {
        biggestArea = a;
        biggest = p;
      }
    }
    return {
      ...feature,
      geometry: { type: 'Polygon', coordinates: biggest },
    };
  }, [feature]);

  const inCountry = useMemo(
    () => datacenters.filter((d) => d.country === countryName && d.city_coords),
    [datacenters, countryName]
  );

  const sortedInCountry = useMemo(() => {
    return [...inCountry].sort((a, b) => {
      const aMw = a.mw_current ?? -1;
      const bMw = b.mw_current ?? -1;
      if (aMw !== bMw) return bMw - aMw;
      return a.name.localeCompare(b.name);
    });
  }, [inCountry]);

  // Stable handlers so memoized SidebarRow doesn't re-render when these refs
  // change between parent renders.
  const onRowHover = useCallback((dc: Datacenter) => setHoverDc(dc), []);
  const onRowLeave = useCallback(
    (dc: Datacenter) => setHoverDc((curr) => (curr === dc ? null : curr)),
    []
  );
  const onRowSelect = useCallback((dc: Datacenter) => setSelectedDc(dc), []);

  const isMobile = useIsMobile();

  // Layout: desktop = sidebar on left, map fills the rest. Mobile = map at the
  // top (~55vh), sidebar list scrolls under it.
  const mapLeft = isMobile ? 0 : LEFT_PANEL_WIDTH;
  const mapWidth = isMobile ? width : Math.max(400, width - LEFT_PANEL_WIDTH);
  const mapHeight = isMobile ? Math.round(height * 0.55) : height;

  const { fullPathD, mainlandPathD, pins } = useMemo(() => {
    if (!feature || !projectionFeature) {
      return { fullPathD: '', mainlandPathD: '', pins: [] as { x: number; y: number; dc: Datacenter }[] };
    }
    const padX = isMobile ? 24 : 60;
    const padTop = isMobile ? 84 : 80;
    const padBottom = isMobile ? 12 : 60;
    const proj = geoMercator().fitExtent(
      [
        [mapLeft + padX, padTop],
        [mapLeft + mapWidth - padX, mapHeight - padBottom],
      ],
      projectionFeature
    );
    const path = geoPath(proj);
    const ps = inCountry
      .map((dc) => {
        const [lat, lng] = dc.city_coords!;
        const p = proj([lng, lat]);
        if (!p) return null;
        return { x: p[0], y: p[1], dc };
      })
      .filter((p): p is { x: number; y: number; dc: Datacenter } => p !== null);
    return {
      fullPathD: path(feature) || '',
      mainlandPathD: path(projectionFeature) || '',
      pins: ps,
    };
  }, [feature, projectionFeature, inCountry, mapLeft, mapWidth, mapHeight, isMobile]);

  // Outlying-territory pins (those outside the mainland fit) — render at edge as "off-map" markers
  const visiblePins = pins.filter(
    (p) =>
      p.x >= mapLeft - 10 &&
      p.x <= mapLeft + mapWidth + 10 &&
      p.y >= -10 &&
      p.y <= mapHeight + 10
  );
  const offMapCount = pins.length - visiblePins.length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0 z-20 bg-[#0c0c0e]/95 backdrop-blur-xl"
    >
      <motion.svg
        width={isMobile ? width : width}
        height={isMobile ? mapHeight : height}
        className="absolute top-0 left-0"
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Mainland outline (the part the projection is fit to) */}
        <motion.path
          d={mainlandPathD}
          fill="rgba(255, 159, 67, 0.05)"
          stroke="#ff9f43"
          strokeWidth={1.2}
          strokeOpacity={0.85}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />

        {/* Faint full outline (Alaska/Hawaii etc.) — visible but secondary */}
        {fullPathD !== mainlandPathD && (
          <path
            d={fullPathD}
            fill="none"
            stroke="#ff9f43"
            strokeWidth={0.6}
            strokeOpacity={0.3}
          />
        )}

        {/* 📍 emoji markers — single <text> per pin. The text element itself is
            the hit target (its bounding box is ~18×18, plenty clickable). Cuts
            DOM nodes per pin from 3 → 1 — saves ~6,000 nodes in the US view. */}
        {visiblePins.map((p, i) => {
          const isActive = selectedDc === p.dc || hoverDc === p.dc;
          return (
            <text
              key={i}
              x={p.x}
              y={p.y}
              fontSize={isActive ? PIN_FONT_SIZE_HOVER : PIN_FONT_SIZE}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                cursor: 'pointer',
                filter: isActive
                  ? 'drop-shadow(0 0 6px rgba(255,159,67,0.9))'
                  : 'drop-shadow(0 0 2px rgba(0,0,0,0.85))',
              }}
              onMouseEnter={() => {
                setHoverDc(p.dc);
                setHoverPos({ x: p.x, y: p.y });
              }}
              onMouseLeave={() => setHoverDc((curr) => (curr === p.dc ? null : curr))}
              onClick={() => setSelectedDc(p.dc)}
            >
              📍
            </text>
          );
        })}
      </motion.svg>

      {/* Left stats panel — desktop: side column. Mobile: stacks under the map. */}
      <motion.aside
        initial={isMobile ? { opacity: 0, y: 30 } : { opacity: 0, x: -20 }}
        animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, x: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className={`absolute pointer-events-auto flex flex-col bg-[#0c0c0e]/85 backdrop-blur-md ${
          isMobile
            ? 'left-0 right-0 border-t border-white/10'
            : 'top-0 left-0 h-full border-r border-white/5'
        }`}
        style={
          isMobile
            ? { top: mapHeight, bottom: 0 }
            : { width: LEFT_PANEL_WIDTH }
        }
      >
        {/* Fixed header — compact on mobile, no longer needs to clear the
            back button since the map is above it. */}
        <div className={`border-b border-white/5 ${isMobile ? 'px-4 pt-3 pb-2' : 'px-6 pt-20 pb-4'}`}>
          <div className="font-mono text-[10px] uppercase tracking-widest text-seismic-orange flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-seismic-orange" />
            {stat?.count.toLocaleString() ?? 0} datacenters
          </div>
          <h2
            className={`font-sans font-light tracking-tighter leading-tight ${
              isMobile ? 'text-xl mt-0.5' : 'text-3xl mt-1'
            }`}
          >
            {countryName}
          </h2>
          {offMapCount > 0 && (
            <div className="mt-1 font-mono text-[9px] text-white/35 uppercase tracking-widest">
              +{offMapCount} off-map territories
            </div>
          )}
        </div>

        {/* Scrolling list of every datacenter in country, sorted by MW desc then name */}
        <div className="flex-1 overflow-y-auto">
          {sortedInCountry.map((dc, i) => (
            <SidebarRow
              key={`${dc.name}-${i}`}
              dc={dc}
              isActive={selectedDc === dc || hoverDc === dc}
              isMobile={isMobile}
              onHover={onRowHover}
              onLeave={onRowLeave}
              onSelect={onRowSelect}
            />
          ))}
        </div>

        <div
          className={`border-t border-white/5 font-mono text-[10px] text-white/35 uppercase tracking-widest pb-safe ${
            isMobile ? 'px-4 py-2' : 'px-6 py-3'
          }`}
        >
          {isMobile ? 'Tap any site for details' : 'Click any site for full details'}
        </div>
      </motion.aside>

      {/* Back button — bigger tap target on mobile, anchored to safe area */}
      <motion.button
        onClick={onClose}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className={`absolute z-30 font-mono uppercase tracking-widest text-white/70 hover:text-seismic-orange transition-colors pointer-events-auto bg-[#0c0c0e]/80 backdrop-blur-md border border-white/10 rounded-full ${
          isMobile
            ? 'top-3 left-3 text-[11px] px-3 py-2'
            : 'top-6 left-6 text-xs px-3 py-1.5 rounded'
        }`}
        style={isMobile ? { marginTop: 'env(safe-area-inset-top)' } : undefined}
      >
        ← Back{isMobile ? '' : ' to globe'}
      </motion.button>

      {/* Hover tooltip — follows cursor near the pin */}
      <AnimatePresence>
        {hoverDc && hoverPos && hoverDc !== selectedDc && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute z-40 pointer-events-none bg-[#0c0c0e]/90 backdrop-blur-md border border-white/15 rounded px-3 py-2 font-mono text-[11px] shadow-xl"
            style={{
              left: Math.min(hoverPos.x + 14, width - 240),
              top: Math.max(0, hoverPos.y - 8),
              minWidth: 200,
              maxWidth: 280,
            }}
          >
            <div className="font-sans font-semibold text-sm text-white leading-tight">
              {hoverDc.name}
            </div>
            <div className="text-[#facc15] mt-0.5 truncate">{hoverDc.company}</div>
            {hoverDc.city && (
              <div className="text-white/60 mt-0.5 truncate">
                {[hoverDc.city, hoverDc.state].filter(Boolean).join(', ')}
              </div>
            )}
            {hoverDc.mw_current != null && (
              <div className="mt-1.5 pt-1.5 border-t border-white/10 flex items-center gap-1.5">
                <Zap size={10} className="text-seismic-orange" />
                <span className="text-[#facc15] font-bold">{hoverDc.mw_current} MW</span>
                {hoverDc.mw_planned_max != null && hoverDc.mw_planned_max !== hoverDc.mw_current && (
                  <span className="text-white/40">/ {hoverDc.mw_planned_max} planned</span>
                )}
              </div>
            )}
            {hoverDc.status && (
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: hoverDc.status === 'operational' ? '#4ade80' : '#facc15' }}
                />
                <span className="text-white/60 uppercase tracking-widest text-[9px]">
                  {hoverDc.status.replace(/_/g, ' ')}
                </span>
              </div>
            )}
            <div className="mt-1.5 text-[9px] text-white/40 uppercase tracking-widest">Click for full info</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected datacenter full card.
          Desktop: floats top-right.
          Mobile: full-width bottom sheet that slides up from below. */}
      <AnimatePresence>
        {selectedDc && (
          <motion.div
            key={selectedDc.name + selectedDc.address}
            initial={isMobile ? { y: '100%' } : { opacity: 0, y: 12, scale: 0.95 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: isMobile ? 0.28 : 0.2, ease: [0.32, 0.72, 0, 1] }}
            className={`bg-[#0c0c0e]/95 backdrop-blur-xl border border-white/15 shadow-2xl overflow-hidden pointer-events-auto z-50 ${
              isMobile
                ? 'fixed left-0 right-0 bottom-0 rounded-t-2xl border-b-0 max-h-[80vh] overflow-y-auto'
                : 'absolute top-24 right-8 w-[340px] rounded-lg'
            }`}
            style={isMobile ? { paddingBottom: 'env(safe-area-inset-bottom)' } : undefined}
          >
            {isMobile && (
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
            )}
            <div className="p-4 border-b border-white/10 flex justify-between items-start bg-white/5">
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-widest text-seismic-orange mb-1">
                  Datacenter
                </div>
                <h3 className="font-sans font-bold text-lg leading-tight">{selectedDc.name}</h3>
              </div>
              <button
                onClick={() => setSelectedDc(null)}
                className="text-gray-400 hover:text-white transition-colors ml-2 flex-shrink-0"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3 font-mono text-xs">
              <div className="flex items-start gap-2">
                <Building2 size={14} className="text-seismic-orange mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-white/40 uppercase tracking-widest text-[10px]">Operator</div>
                  <div className="text-[#facc15] mt-0.5">{selectedDc.company}</div>
                </div>
              </div>
              {selectedDc.owner_ultimate && selectedDc.owner_ultimate !== selectedDc.company && (
                <div className="flex items-start gap-2">
                  <Building2 size={14} className="text-seismic-orange mt-0.5 flex-shrink-0 opacity-50" />
                  <div>
                    <div className="text-white/40 uppercase tracking-widest text-[10px]">
                      Ultimate Owner
                    </div>
                    <div className="text-white/80 mt-0.5">{selectedDc.owner_ultimate}</div>
                  </div>
                </div>
              )}
              {(selectedDc.mw_current != null || selectedDc.mw_planned_max != null) && (
                <div className="flex items-start gap-2">
                  <Zap size={14} className="text-seismic-orange mt-0.5 flex-shrink-0" />
                  <div className="flex gap-4">
                    {selectedDc.mw_current != null && (
                      <div>
                        <div className="text-white/40 uppercase tracking-widest text-[10px]">
                          Current
                        </div>
                        <div className="text-[#facc15] mt-0.5">{selectedDc.mw_current} MW</div>
                      </div>
                    )}
                    {selectedDc.mw_planned_max != null && (
                      <div>
                        <div className="text-white/40 uppercase tracking-widest text-[10px]">
                          Planned Max
                        </div>
                        <div className="text-white/80 mt-0.5">{selectedDc.mw_planned_max} MW</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {selectedDc.status && (
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: selectedDc.status === 'operational' ? '#4ade80' : '#facc15' }}
                  />
                  <span className="text-white/60">{selectedDc.status.replace(/_/g, ' ')}</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-seismic-orange mt-0.5 flex-shrink-0" />
                <div className="text-white/80 leading-relaxed">
                  {selectedDc.street && <div>{selectedDc.street}</div>}
                  <div>
                    {[selectedDc.city, selectedDc.state, selectedDc.zip].filter(Boolean).join(', ')}
                  </div>
                  <div className="text-white/50">{selectedDc.country}</div>
                </div>
              </div>
              {selectedDc.source_url && (
                <a
                  href={selectedDc.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[10px] text-white/40 hover:text-seismic-orange transition-colors uppercase tracking-widest pointer-events-auto"
                >
                  <ExternalLink size={10} />
                  Source
                </a>
              )}
            </div>
            {onEnterTour && (
              <button
                onClick={() => onEnterTour(selectedDc)}
                className="w-full px-4 py-3 border-t border-white/10 flex items-center justify-between text-xs uppercase tracking-widest font-mono text-seismic-orange hover:bg-white/5 transition-colors group"
              >
                <span className="flex items-center gap-2">
                  <Box size={14} />
                  Enter virtual tour
                </span>
                <span className="text-white/40 group-hover:text-seismic-orange transition-colors">
                  →
                </span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default CountryPanel;
