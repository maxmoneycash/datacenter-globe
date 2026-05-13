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

const POLYGON_BASE_ALT = 0.01;
const POLYGON_HOVER_ALT = 0.06;
const GLOBE_RADIUS = 100;       // three-globe internal radius
const PIN_RADIUS = 100.5;       // pin layer sits just above globe surface
const PIN_SIZE = 2.6;           // world-unit size of each emoji sprite

function featureName(d: any): string {
  return normalizeCountry(
    d?.properties?.ADMIN || d?.properties?.NAME || d?.properties?.name || d?.properties?.admin || ''
  );
}

// EXACT three-globe polar→cartesian convention. (90 − lng), not (lng + 180).
// Our previous custom mapping was off by 90° which is why pins landed in oceans.
function polar2Cartesian(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((90 - lng) * Math.PI) / 180;
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

// Render a 📍 emoji to a canvas texture. Reused across all 5,700 pins via
// THREE.Points (one draw call, billboarded = always faces camera).
function makeEmojiTexture(emoji: string, size = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  ctx.font = `${Math.floor(size * 0.82)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Slight Y bias so the pin's point lands close to center
  ctx.fillText(emoji, size / 2, size * 0.55);
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
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

  // Globe scene scaffolding (cyan grid, purple rim, key + fill lights)
  useEffect(() => {
    if (!globeRef.current) return;
    const scene = globeRef.current.scene();
    if (!scene) return;

    const gridGeo = new THREE.SphereGeometry(101, 32, 16);
    const gridMat = new THREE.MeshBasicMaterial({
      color: '#00f0ff',
      wireframe: true,
      transparent: true,
      opacity: 0.05,
    });
    const gridMesh = new THREE.Mesh(gridGeo, gridMat);
    scene.add(gridMesh);

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
    const fillLight = new THREE.PointLight(0x00f0ff, 1.6);
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

  /**
   * Datacenter pin layer — 📍 emoji rendered via THREE.Points.
   *
   * THREE.Points is the right primitive for this:
   *   • Billboarded — every quad always faces the camera, so the 📍 emoji
   *     always reads as a pushpin no matter where it sits on the sphere.
   *   • One draw call for all ~5,700 markers (single BufferGeometry).
   *   • PointsMaterial with `map` lets us use the emoji canvas as a sprite.
   *
   * We disable depth test / write and use a high renderOrder so the pins
   * always paint on top of polygons — including when a country lifts on hover.
   *
   * The whole layer is attached to react-globe.gl's globe group so it inherits
   * auto-rotation + orbit controls.
   */
  useEffect(() => {
    if (!globeRef.current) return;
    const scene = globeRef.current.scene();
    if (!scene) return;
    if (datacenters.length === 0) return;

    // Find the globe group so our pins rotate with it.
    let globeGroup: THREE.Object3D = scene;
    scene.traverse((obj: any) => {
      if (globeGroup !== scene) return;
      if (obj.isGroup && obj.children?.some((c: any) => c.isMesh)) {
        globeGroup = obj;
      }
    });

    const positions = new Float32Array(datacenters.length * 3);
    for (let i = 0; i < datacenters.length; i++) {
      const [lat, lng] = datacenters[i].city_coords!;
      const v = polar2Cartesian(lat, lng, PIN_RADIUS);
      positions[i * 3] = v.x;
      positions[i * 3 + 1] = v.y;
      positions[i * 3 + 2] = v.z;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const texture = makeEmojiTexture('📍');

    const material = new THREE.PointsMaterial({
      map: texture,
      size: PIN_SIZE,
      transparent: true,
      alphaTest: 0.1,
      depthTest: false,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const pinsMesh = new THREE.Points(geometry, material);
    pinsMesh.renderOrder = 1000;
    pinsMesh.frustumCulled = false;

    globeGroup.add(pinsMesh);

    return () => {
      globeGroup.remove(pinsMesh);
      geometry.dispose();
      material.dispose();
      texture.dispose();
    };
  }, [datacenters]);

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
      />
    </div>
  );
};

export default Globe;
