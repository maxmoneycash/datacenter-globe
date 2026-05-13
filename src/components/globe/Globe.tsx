import React, { useRef, useState, useEffect, useMemo } from 'react';
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

// Flat dots sitting just above the polygon cap. Polygon altitude is static
// (no hover lift) so dots are never occluded by a rising surface.
const BASE_POINT_ALT = 0.012;

function featureName(d: any): string {
  return normalizeCountry(d?.properties?.ADMIN || d?.properties?.NAME || d?.properties?.name || d?.properties?.admin || '');
}

const Globe: React.FC<GlobeProps> = ({ datacenters, countryStats, onCountryClick, isPaused, onBackgroundClick, selectedCountryName }) => {
  const globeRef = useRef<any>(null);
  const [countries, setCountries] = useState<any>({ features: [] });
  const [hoverD, setHoverD] = useState<any>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // MeshStandardMaterial is ~2× faster than MeshPhysicalMaterial (no clearcoat pass).
  // Look stays dark + glossy via low roughness + high metalness; the cyan tint comes
  // from the grid wireframe + atmosphere rather than specularColor.
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

    // Holographic grid — lower-density wireframe (32×16 vs 48×48 = ~6× fewer verts)
    const gridGeo = new THREE.SphereGeometry(101, 32, 16);
    const gridMat = new THREE.MeshBasicMaterial({
      color: '#00f0ff',
      wireframe: true,
      transparent: true,
      opacity: 0.05,
    });
    const gridMesh = new THREE.Mesh(gridGeo, gridMat);
    scene.add(gridMesh);

    // Purple rim — single back-side sphere, AdditiveBlending stays for the bloom feel
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

    // Single directional + ambient (was 2 point lights → expensive per-fragment lighting calc).
    // Specular highlights on the globe come from the material's `specularColor` regardless.
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(200, 200, 200);
    scene.add(keyLight);

    return () => {
      scene.remove(gridMesh);
      scene.remove(rimMesh);
      scene.remove(ambientLight);
      scene.remove(keyLight);
    };
  }, []);

  const getStat = (d: any): CountryStat | undefined => countryStats.get(featureName(d));

  // Cyan dots — one batched WebGL draw call for all ~5,700 markers via
  // `pointsMerge`. 5,722 HTML elements would chew the CPU/DOM; canvas points
  // are essentially free. The country flat-map view still uses 📡 emoji because
  // it only has a few hundred markers at most.
  const points = useMemo(() => {
    return datacenters.map((dc) => {
      const [lat, lng] = dc.city_coords!;
      return { lat, lng, color: '#00f0ff', country: dc.country };
    });
  }, [datacenters]);

  const hoveredName = hoverD ? featureName(hoverD) : null;

  // Dedupe hover updates: react-globe.gl fires onPolygonHover every frame the cursor
  // moves, even when the polygon under the cursor hasn't changed. That re-renders
  // the entire Globe component on every mouse pixel. Only update state on actual change.
  const handlePolygonHover = (d: any) => {
    setHoverD((prev: any) => (prev === d ? prev : d));
  };

  return (
    <div className="w-full h-screen bg-[#000000] cursor-crosshair">
      <GlobeGL
        ref={globeRef}
        width={windowSize.width}
        height={windowSize.height}
        backgroundColor="#000000"
        globeMaterial={customGlobeMaterial}
        polygonsData={countries.features}
        polygonAltitude={0.01}
        polygonCapColor={(d: any) => {
          const isSelected = selectedCountryName === featureName(d);
          if (d === hoverD || isSelected) return '#ffffff';
          const stat = getStat(d);
          return BUCKET_COLORS[bucketFor(stat?.count ?? 0)];
        }}
        polygonSideColor={() => 'rgba(0, 0, 0, 0.5)'}
        polygonStrokeColor={() => '#111111'}
        polygonLabel={(polygon: any) => {
          const name = featureName(polygon);
          const stat = countryStats.get(name);
          const count = stat?.count ?? 0;
          const top = stat?.topCompanies?.slice(0, 3) ?? [];
          const topRows = top
            .map(
              (c) => `<div class="flex justify-between gap-3 text-[10px]"><span class="text-white/80">${c.company}</span><span class="text-[#facc15]">${c.count}</span></div>`
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
        }}
        onPolygonHover={handlePolygonHover}
        onPolygonClick={(polygon: any) => {
          const name = featureName(polygon);
          const stat = countryStats.get(name);
          if (stat && stat.count > 0) onCountryClick(name);
        }}
        onGlobeClick={onBackgroundClick}
        polygonsTransitionDuration={300}
        showAtmosphere={true}
        atmosphereColor="#8b5cf6"
        atmosphereAltitude={0.15}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointAltitude={BASE_POINT_ALT}
        pointRadius={0.35}
        pointResolution={4}
        pointsMerge={true}
        pointsTransitionDuration={0}
      />
    </div>
  );
};

export default Globe;
