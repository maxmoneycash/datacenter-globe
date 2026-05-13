import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import GlobeGL from 'react-globe.gl';
import * as THREE from 'three';
import type { CountryStat, Datacenter } from './types';
import { BUCKET_COLORS, bucketFor, normalizeCountry } from './constants';

interface GlobeProps {
  datacenters: Datacenter[];
  countryStats: Map<string, CountryStat>;
  onCountryClick: (countryName: string) => void;
  isPaused: boolean;
  onBackgroundClick: () => void;
  selectedCountryName?: string | null;
}

// Pin sits at altitude 0.011 (just above unlifted polygon at 0.01). When a
// country is hovered, its polygon lifts to 0.06 — the dot is then occluded by
// the white cap, which matches the original Gini visualization's "card-lift"
// hover feedback. We accept that tradeoff to keep the geometry static and
// the FPS smooth.
const BASE_POINT_ALT = 0.011;
const POLYGON_BASE_ALT = 0.01;
const POLYGON_HOVER_ALT = 0.06;
const PIN_COLOR = '#9ca3af'; // tailwind gray-400 — neutral grey, no theme colour

function featureName(d: any): string {
  return normalizeCountry(
    d?.properties?.ADMIN || d?.properties?.NAME || d?.properties?.name || d?.properties?.admin || ''
  );
}

const Globe: React.FC<GlobeProps> = ({
  datacenters,
  countryStats,
  onCountryClick,
  isPaused,
  onBackgroundClick,
  selectedCountryName,
}) => {
  const globeRef = useRef<any>(null);
  const [countries, setCountries] = useState<any>({ features: [] });
  const [hoverD, setHoverD] = useState<any>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  const customGlobeMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#050505',
      roughness: 0.15,
      metalness: 0.7,
      transparent: true,
      opacity: 0.35,
    });
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetch('https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson')
      .then((res) => res.json())
      .then((data) => setCountries(data))
      .catch((err) => console.error('Failed to load country borders', err));
  }, []);

  useEffect(() => {
    const setRotation = () => {
      if (globeRef.current) {
        const controls = globeRef.current.controls();
        if (controls) {
          controls.autoRotate = !isPaused;
          controls.autoRotateSpeed = 0.5;
        } else {
          setTimeout(setRotation, 100);
        }
      }
    };
    setRotation();
  }, [isPaused]);

  useEffect(() => {
    if (!globeRef.current) return;
    const scene = globeRef.current.scene();
    if (!scene) return;

    // Purple rim — single back-side sphere, AdditiveBlending stays for the bloom feel.
    // Dropped the cyan wireframe grid layer entirely (it was barely visible at 5%
    // opacity and added another draw call across the whole sphere).
    const rimGeo = new THREE.SphereGeometry(100, 32, 32);
    const rimMat = new THREE.MeshBasicMaterial({
      color: '#8b5cf6',
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.scale.set(1.05, 1.05, 1.05);
    scene.add(rimMesh);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(200, 200, 200);
    scene.add(keyLight);

    return () => {
      scene.remove(rimMesh);
      scene.remove(ambientLight);
      scene.remove(keyLight);
    };
  }, []);

  // Precompute the per-polygon base color ONCE (when stats arrive).
  // Avoids running bucketFor + Map lookup for all 177 polygons on every render.
  const polygonBaseColorMap = useMemo(() => {
    const map = new WeakMap<object, string>();
    for (const f of countries.features) {
      const stat = countryStats.get(featureName(f));
      map.set(f, BUCKET_COLORS[bucketFor(stat?.count ?? 0)]);
    }
    return map;
  }, [countries, countryStats]);

  // Stable callback identities — only change when hover/select state changes,
  // so react-globe.gl can skip re-applying props that didn't change.
  const polygonCapColor = useCallback(
    (d: any) => {
      if (d === hoverD) return '#ffffff';
      if (selectedCountryName && featureName(d) === selectedCountryName) return '#ffffff';
      return polygonBaseColorMap.get(d) || BUCKET_COLORS.none;
    },
    [hoverD, selectedCountryName, polygonBaseColorMap]
  );

  const polygonAltitude = useCallback(
    (d: any) => {
      if (d === hoverD) return POLYGON_HOVER_ALT;
      if (selectedCountryName && featureName(d) === selectedCountryName) return POLYGON_HOVER_ALT;
      return POLYGON_BASE_ALT;
    },
    [hoverD, selectedCountryName]
  );

  // Stable accessor references for props that never change between renders.
  const polygonSideColor = useCallback(() => 'rgba(0, 0, 0, 0.5)', []);
  const polygonStrokeColor = useCallback(() => '#111111', []);

  const points = useMemo(() => {
    return datacenters.map((dc) => {
      const [lat, lng] = dc.city_coords!;
      return { lat, lng, color: PIN_COLOR };
    });
  }, [datacenters]);

  const handlePolygonHover = useCallback((d: any) => {
    setHoverD((prev: any) => (prev === d ? prev : d));
  }, []);

  const handlePolygonClick = useCallback(
    (polygon: any) => {
      const name = featureName(polygon);
      const stat = countryStats.get(name);
      if (stat && stat.count > 0) onCountryClick(name);
    },
    [countryStats, onCountryClick]
  );

  const polygonLabel = useCallback(
    (polygon: any) => {
      const name = featureName(polygon);
      const stat = countryStats.get(name);
      const count = stat?.count ?? 0;
      const top = stat?.topCompanies?.slice(0, 3) ?? [];
      const topRows = top
        .map(
          (c) =>
            `<div class="flex justify-between gap-3 text-[10px]"><span class="text-white/80">${c.company}</span><span class="text-[#facc15]">${c.count}</span></div>`
        )
        .join('');
      return `
        <div class="bg-black/80 backdrop-blur-md border border-white/20 p-2.5 rounded text-white font-mono text-xs shadow-lg pointer-events-none min-w-[220px]">
          <div class="font-bold text-sm mb-1">${name || 'Unknown'}</div>
          <div class="text-gray-400 mb-1">Datacenters: <span class="text-white font-bold">${count.toLocaleString()}</span></div>
          ${topRows ? `<div class="mt-2 pt-2 border-t border-white/10 space-y-0.5">${topRows}</div>` : ''}
          ${count > 0 ? '<div class="mt-2 text-[10px] text-[#ff9f43]">click to enter →</div>' : ''}
        </div>
      `;
    },
    [countryStats]
  );

  return (
    <div className="w-full h-screen bg-[#000000] cursor-crosshair">
      <GlobeGL
        ref={globeRef}
        width={windowSize.width}
        height={windowSize.height}
        backgroundColor="#000000"
        globeMaterial={customGlobeMaterial}
        polygonsData={countries.features}
        polygonAltitude={polygonAltitude}
        polygonCapColor={polygonCapColor}
        polygonSideColor={polygonSideColor}
        polygonStrokeColor={polygonStrokeColor}
        polygonLabel={polygonLabel}
        onPolygonHover={handlePolygonHover}
        onPolygonClick={handlePolygonClick}
        onGlobeClick={onBackgroundClick}
        polygonsTransitionDuration={250}
        showAtmosphere={true}
        atmosphereColor="#8b5cf6"
        atmosphereAltitude={0.15}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointAltitude={BASE_POINT_ALT}
        pointRadius={0.32}
        pointResolution={3}
        pointsMerge={true}
        pointsTransitionDuration={0}
      />
    </div>
  );
};

export default Globe;
