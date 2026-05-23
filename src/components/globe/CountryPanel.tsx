import React, { useMemo, useState, useCallback, memo, useEffect, useRef } from 'react';
import { X, MapPin, Building2, Box, Zap, ExternalLink, Eye } from 'lucide-react';
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
  // Optional pre-selected datacenter (e.g. from search box). Auto-opens its card on mount.
  initialSelectedDc?: Datacenter | null;
  onConsumedInitialDc?: () => void;
}

// Reserve a fixed left column for the stats panel; the map takes the rest.
const LEFT_PANEL_WIDTH = 340;

// 📍 emoji markers — match the world-globe view.
// 📍 canvas pin sizes (sprite is 56×56 with halo → display sized for readability)
const PIN_SIZE = 26;
const PIN_SIZE_HOVER = 36;
const PIN_HIT_RADIUS = 18;

// Sidebar row virtualization
const ROW_HEIGHT = 88;
const ROW_OVERSCAN = 6;

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
        isMobile ? 'px-4' : 'px-6'
      }`}
      style={{
        height: ROW_HEIGHT,
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
  initialSelectedDc,
  onConsumedInitialDc,
}) => {
  const [selectedDc, setSelectedDc] = useState<Datacenter | null>(initialSelectedDc ?? null);
  const [hoverDc, setHoverDc] = useState<Datacenter | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const pinSpriteRef = useRef<HTMLCanvasElement | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [sidebarHeight, setSidebarHeight] = useState(600);
  const [sidebarScroll, setSidebarScroll] = useState(0);

  // One-time: render the 📍 emoji to an offscreen canvas — reused as a sprite
  // for every pin draw. Includes a dark circular halo + drop shadow so pins
  // remain visible on bright country fills (red/yellow/orange).
  useEffect(() => {
    const c = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    c.width = 56 * dpr;
    c.height = 56 * dpr;
    const ctx = c.getContext('2d')!;
    ctx.scale(dpr, dpr);
    // Dark halo behind the pin — translucent black disc with soft edge
    const grad = ctx.createRadialGradient(28, 30, 4, 28, 30, 16);
    grad.addColorStop(0, 'rgba(0,0,0,0.85)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.55)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(28, 30, 16, 0, Math.PI * 2);
    ctx.fill();
    // Emoji with a hard black shadow for extra punch on any background
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    ctx.font = '34px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📍', 28, 30);
    pinSpriteRef.current = c;
  }, []);

  useEffect(() => {
    if (initialSelectedDc) {
      setSelectedDc(initialSelectedDc);
      onConsumedInitialDc?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedDc]);

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
  const visiblePins = useMemo(
    () =>
      pins.filter(
        (p) =>
          p.x >= mapLeft - 10 &&
          p.x <= mapLeft + mapWidth + 10 &&
          p.y >= -10 &&
          p.y <= mapHeight + 10
      ),
    [pins, mapLeft, mapWidth, mapHeight]
  );
  const offMapCount = pins.length - visiblePins.length;

  // ─── Two-canvas pin layer:
  //   • BASE canvas: every pin drawn once. Only redraws when the dataset/layout
  //     changes (entering a new country, resizing). Never on hover.
  //   • OVERLAY canvas: only the active pin (hovered or selected) with glow.
  //     Redraws on every hover change but writes ~1 pin to a tiny region —
  //     essentially free.
  // This decouples hover responsiveness from pin count.
  useEffect(() => {
    const canvas = baseCanvasRef.current;
    const sprite = pinSpriteRef.current;
    if (!canvas || !sprite) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = width;
    const ch = isMobile ? mapHeight : height;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    for (const p of visiblePins) {
      ctx.drawImage(sprite, p.x - PIN_SIZE / 2, p.y - PIN_SIZE / 2, PIN_SIZE, PIN_SIZE);
    }
  }, [visiblePins, width, height, mapHeight, isMobile]);

  // Overlay redraws ONLY on hover/select change — 1 drawImage, not 2,800.
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    const sprite = pinSpriteRef.current;
    if (!canvas || !sprite) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = width;
    const ch = isMobile ? mapHeight : height;
    if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    const active = visiblePins.find((p) => p.dc === selectedDc || p.dc === hoverDc);
    if (active) {
      const sz = PIN_SIZE_HOVER;
      ctx.save();
      ctx.shadowColor = 'rgba(255, 159, 67, 0.95)';
      ctx.shadowBlur = 10;
      ctx.drawImage(sprite, active.x - sz / 2, active.y - sz / 2, sz, sz);
      ctx.restore();
    }
  }, [visiblePins, selectedDc, hoverDc, width, height, mapHeight, isMobile]);

  // ─── Canvas hit testing: RAF-throttled nearest-pin lookup.
  const lastMoveRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number>(0);

  const runHitTest = useCallback(() => {
    rafRef.current = 0;
    const m = lastMoveRef.current;
    if (!m) return;
    let nearest: { dc: Datacenter; x: number; y: number } | null = null;
    let bestDist = PIN_HIT_RADIUS;
    for (const p of visiblePins) {
      const dx = p.x - m.x;
      const dy = p.y - m.y;
      const d = Math.hypot(dx, dy);
      if (d < bestDist) {
        bestDist = d;
        nearest = p;
      }
    }
    if (nearest) {
      setHoverDc((prev) => (prev === nearest!.dc ? prev : nearest!.dc));
      setHoverPos({ x: nearest.x, y: nearest.y });
    } else {
      setHoverDc((prev) => (prev === null ? prev : null));
    }
  }, [visiblePins]);

  const handleCanvasMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      lastMoveRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (!rafRef.current) rafRef.current = requestAnimationFrame(runHitTest);
    },
    [runHitTest]
  );

  const handleCanvasLeave = useCallback(() => {
    lastMoveRef.current = null;
    setHoverDc((prev) => (prev === null ? prev : null));
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      let nearest: { dc: Datacenter } | null = null;
      let bestDist = PIN_HIT_RADIUS;
      for (const p of visiblePins) {
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < bestDist) {
          bestDist = d;
          nearest = p;
        }
      }
      if (nearest) setSelectedDc(nearest.dc);
    },
    [visiblePins]
  );

  // ─── Sidebar virtualization: track container height + scroll
  useEffect(() => {
    const el = sidebarRef.current;
    if (!el) return;
    const measure = () => setSidebarHeight(el.clientHeight);
    measure();
    const onScroll = () => setSidebarScroll(el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="absolute inset-0 z-20 bg-[#0c0c0e]/95 backdrop-blur-xl"
    >
      {/* Pin layers: base = all pins (static), overlay = active pin only. */}
      <canvas
        ref={baseCanvasRef}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ zIndex: 1 }}
      />
      <canvas
        ref={overlayCanvasRef}
        onMouseMove={handleCanvasMove}
        onMouseLeave={handleCanvasLeave}
        onClick={handleCanvasClick}
        className="absolute top-0 left-0"
        style={{ cursor: hoverDc ? 'pointer' : 'default', zIndex: 2 }}
      />

      <motion.svg
        width={isMobile ? width : width}
        height={isMobile ? mapHeight : height}
        className="absolute top-0 left-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        {/* Mainland outline — instant, no path-stroke animation */}
        <path
          d={mainlandPathD}
          fill="rgba(255, 159, 67, 0.05)"
          stroke="#ff9f43"
          strokeWidth={1.2}
          strokeOpacity={0.85}
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

        {/* Pins are drawn on the canvas above — no SVG pin nodes anymore. */}
      </motion.svg>

      {/* Left stats panel — desktop: side column. Mobile: stacks under the map. */}
      <motion.aside
        initial={isMobile ? { opacity: 0, y: 20 } : { opacity: 0, x: -10 }}
        animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, x: 0 }}
        transition={{ duration: 0.18 }}
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

        {/* Virtualized scrolling list — only renders the rows actually visible
            in the viewport (~25 of 2,800 for the US). Massive memory and paint
            cost reduction for big countries. */}
        <div ref={sidebarRef} className="flex-1 overflow-y-auto relative">
          {(() => {
            const total = sortedInCountry.length;
            const firstIndex = Math.max(
              0,
              Math.floor(sidebarScroll / ROW_HEIGHT) - ROW_OVERSCAN
            );
            const lastIndex = Math.min(
              total,
              Math.ceil((sidebarScroll + sidebarHeight) / ROW_HEIGHT) + ROW_OVERSCAN
            );
            const slice = sortedInCountry.slice(firstIndex, lastIndex);
            return (
              <div style={{ height: total * ROW_HEIGHT, position: 'relative' }}>
                <div style={{ position: 'absolute', top: firstIndex * ROW_HEIGHT, left: 0, right: 0 }}>
                  {slice.map((dc, i) => (
                    <SidebarRow
                      key={`${dc.name}-${firstIndex + i}`}
                      dc={dc}
                      isActive={selectedDc === dc || hoverDc === dc}
                      isMobile={isMobile}
                      onHover={onRowHover}
                      onLeave={onRowLeave}
                      onSelect={onRowSelect}
                    />
                  ))}
                </div>
              </div>
            );
          })()}
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
        transition={{ duration: 0.15 }}
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
          Mobile: full-screen sheet — covers the entire viewport so it doesn't
          overlap with the sidebar list awkwardly. Tap backdrop to dismiss. */}
      <AnimatePresence>
        {selectedDc && isMobile && (
          <motion.div
            key="mobile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setSelectedDc(null)}
            className="fixed inset-0 z-40 bg-black/55 pointer-events-auto"
          />
        )}
        {selectedDc && (
          <motion.div
            key={selectedDc.name + selectedDc.address}
            initial={isMobile ? { y: '100%' } : { opacity: 0, y: 12, scale: 0.95 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={isMobile ? { y: '100%' } : { opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: isMobile ? 0.28 : 0.2, ease: [0.32, 0.72, 0, 1] }}
            className={`bg-[#0c0c0e]/98 backdrop-blur-xl border border-white/15 shadow-2xl pointer-events-auto z-50 ${
              isMobile
                ? 'fixed left-0 right-0 bottom-0 rounded-t-2xl border-b-0 max-h-[88vh] flex flex-col'
                : 'absolute top-24 right-8 w-[340px] rounded-lg overflow-hidden'
            }`}
            style={
              isMobile
                ? {
                    paddingBottom: 'env(safe-area-inset-bottom)',
                    WebkitOverflowScrolling: 'touch',
                  }
                : undefined
            }
          >
            {isMobile && (
              <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
                <div className="w-12 h-1.5 rounded-full bg-white/25" />
              </div>
            )}
            <div className={`border-b border-white/10 flex justify-between items-start bg-white/5 ${isMobile ? 'p-4 flex-shrink-0' : 'p-4'}`}>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-widest text-seismic-orange mb-1">
                  Datacenter
                </div>
                <h3 className="font-sans font-bold text-lg leading-tight break-words">{selectedDc.name}</h3>
              </div>
              <button
                onClick={() => setSelectedDc(null)}
                aria-label="Close"
                className={`text-white/70 hover:text-white transition-colors ml-3 flex-shrink-0 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center ${
                  isMobile ? 'w-10 h-10' : 'w-7 h-7'
                }`}
              >
                <X size={isMobile ? 20 : 16} />
              </button>
            </div>
            <div
              className={`p-4 space-y-3 font-mono text-xs ${isMobile ? 'overflow-y-auto flex-1 -webkit-overflow-scrolling-touch' : ''}`}
              style={isMobile ? { WebkitOverflowScrolling: 'touch' as any } : undefined}
            >
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
                <div className="text-white/80 leading-relaxed flex-1 min-w-0">
                  {selectedDc.street && <div className="break-words">{selectedDc.street}</div>}
                  <div className="break-words">
                    {[selectedDc.city, selectedDc.state, selectedDc.zip].filter(Boolean).join(', ')}
                  </div>
                  <div className="text-white/50">{selectedDc.country}</div>
                  {selectedDc.city_coords && (
                    <div className="text-white/40 text-[10px] mt-1 tabular-nums">
                      {selectedDc.city_coords[0].toFixed(4)}°, {selectedDc.city_coords[1].toFixed(4)}°
                    </div>
                  )}
                </div>
              </div>

              {/* Map + Street View thumbnails — open in new tab, no API key */}
              {selectedDc.city_coords && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={`https://www.google.com/maps?q=${selectedDc.city_coords[0]},${selectedDc.city_coords[1]}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 text-[10px] text-white/75 hover:text-seismic-orange bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded px-2 py-2 transition-colors uppercase tracking-widest"
                  >
                    <MapPin size={11} />
                    Google Maps
                  </a>
                  <a
                    href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${selectedDc.city_coords[0]},${selectedDc.city_coords[1]}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 text-[10px] text-white/75 hover:text-seismic-orange bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded px-2 py-2 transition-colors uppercase tracking-widest"
                  >
                    <Eye size={11} />
                    Street View
                  </a>
                </div>
              )}

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
