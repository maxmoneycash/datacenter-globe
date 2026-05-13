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

// Pin altitude is essentially flat (just above the polygon's base altitude).
// The trick that keeps them visible when a country lifts on hover: after
// react-globe.gl mounts the merged points mesh, we patch its material so it
// ignores depth-test and uses a high renderOrder. Result: dots always paint
// on top of polygons in 2D screen space, regardless of how high the polygon
// rises. No 3D cylinder lift needed.
const PIN_ALT = 0.012;
const POLYGON_BASE_ALT = 0.01;
const POLYGON_HOVER_ALT = 0.06;
const PIN_COLOR = '#d4d4d8'; // zinc-300 — bright neutral grey
const PIN_RADIUS = 0.38;

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

  // Original look: PhysicalMaterial with cyan specular + clearcoat for the
  // wet-glass globe sheen. (Switched back from Standard because the original
  // visual signature relies on clearcoat highlights.)
  const customGlobeMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#050505',
      emissive: '#000000',
      roughness: 0.05,
      metalness: 0.6,
      transparent: true,
      opacity: 0.3,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      reflectivity: 1.0,
      specularIntensity: 2.0,
      specularColor: new THREE.Color('#00f0ff'),
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

    // Cyan holographic grid (restored from original aesthetic) — low subdivision
    // to keep it cheap.
    const gridGeo = new THREE.SphereGeometry(101, 32, 16);
    const gridMat = new THREE.MeshBasicMaterial({
      color: '#00f0ff',
      wireframe: true,
      transparent: true,
      opacity: 0.05,
    });
    const gridMesh = new THREE.Mesh(gridGeo, gridMat);
    scene.add(gridMesh);

    // Purple atmosphere rim
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

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambientLight);
    const keyLight = new THREE.PointLight(0xffffff, 2.0);
    keyLight.position.set(200, 200, 200);
    scene.add(keyLight);
    const fillLight = new THREE.PointLight(0x00f0ff, 1.6); // cyan accent fills the shadow side
    fillLight.position.set(-200, -100, -100);
    scene.add(fillLight);

    return () => {
      scene.remove(gridMesh);
      scene.remove(rimMesh);
      scene.remove(ambientLight);
      scene.remove(keyLight);
      scene.remove(fillLight);
    };
  }, []);

  // Precomputed per-polygon base color (no per-render bucketFor calls).
  const polygonBaseColorMap = useMemo(() => {
    const map = new WeakMap<object, string>();
    for (const f of countries.features) {
      const stat = countryStats.get(featureName(f));
      map.set(f, BUCKET_COLORS[bucketFor(stat?.count ?? 0)]);
    }
    return map;
  }, [countries, countryStats]);

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

  const polygonSideColor = useCallback(() => 'rgba(0, 0, 0, 0.5)', []);
  const polygonStrokeColor = useCallback(() => '#111111', []);

  const points = useMemo(() => {
    return datacenters.map((dc) => {
      const [lat, lng] = dc.city_coords!;
      return { lat, lng, color: PIN_COLOR };
    });
  }, [datacenters]);

  // === The "always-on-top flat dots" trick ===
  // After the points mesh is created, walk the scene, find it, and disable
  // depth-testing on its material + set a high renderOrder. The points then
  // paint last and never get occluded by polygons (even when a country lifts).
  // We re-run when the dataset size changes (rare — basically once on mount).
  useEffect(() => {
    if (!globeRef.current || points.length === 0) return;
    let raf = 0;
    let tries = 0;

    const tryPatch = () => {
      const globe = globeRef.current;
      const scene = globe?.scene?.();
      if (!scene) {
        raf = requestAnimationFrame(tryPatch);
        return;
      }
      // Find the merged points mesh. react-globe.gl tags its objects via the
      // __globeObjType / userData convention. We fall back to a vertex-count
      // heuristic if that's missing.
      let pointsMesh: THREE.Mesh | null = null;
      scene.traverse((obj: any) => {
        if (pointsMesh) return;
        if (obj?.isMesh && obj.material && obj.geometry) {
          if (
            obj.__globeObjType === 'points' ||
            obj.userData?.__globeObjType === 'points' ||
            obj.name === 'Points'
          ) {
            pointsMesh = obj;
          }
        }
      });
      // Fallback heuristic: a mesh with many vertices that isn't the globe sphere.
      // The globe sphere has 75×75 verts; merged points with ~5,700 markers
      // × 7 verts per cylinder ≈ 40,000 — much larger.
      if (!pointsMesh) {
        scene.traverse((obj: any) => {
          if (pointsMesh) return;
          if (
            obj?.isMesh &&
            obj.material &&
            obj.geometry?.attributes?.position?.count > 20000 &&
            obj.geometry.attributes.position.count < 100000
          ) {
            pointsMesh = obj;
          }
        });
      }

      if (pointsMesh) {
        const mat = (pointsMesh as THREE.Mesh).material as THREE.Material;
        // Cast to access the standard material properties uniformly.
        (mat as any).depthTest = false;
        (mat as any).depthWrite = false;
        (mat as any).transparent = true;
        (mat as any).needsUpdate = true;
        (pointsMesh as THREE.Mesh).renderOrder = 1000;
      } else if (tries < 30) {
        tries++;
        raf = requestAnimationFrame(tryPatch);
      }
    };

    raf = requestAnimationFrame(tryPatch);
    return () => cancelAnimationFrame(raf);
  }, [points]);

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
        polygonsTransitionDuration={300}
        showAtmosphere={true}
        atmosphereColor="#8b5cf6"
        atmosphereAltitude={0.15}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointAltitude={PIN_ALT}
        pointRadius={PIN_RADIUS}
        pointResolution={8}
        pointsMerge={true}
        pointsTransitionDuration={0}
      />
    </div>
  );
};

export default Globe;
