import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import GlobeGL from 'react-globe.gl';
import * as THREE from 'three';
import type { CountryStat, Datacenter } from './types';
import { BUCKET_COLORS, bucketFor, normalizeCountry } from './constants';
import { useIsTouch } from './useIsMobile';

interface GlobeProps {
  datacenters: Datacenter[];
  countryStats: Map<string, CountryStat>;
  onCountryClick: (countryName: string) => void;
  isPaused: boolean;
  onBackgroundClick: () => void;
  selectedCountryName?: string | null;
}

const PIN_RAYCAST_LAYER = 1;

// No more hover lift — polygons stay at base altitude. The color flash to
// white on hover is the only feedback.
const POLYGON_ALT = 0.01;
const GLOBE_RADIUS = 100;
const PIN_RADIUS = 101.05; // just above the polygon cap at radius 101
const PIN_SIZE = 2.6;

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
  const pinsMeshRef = useRef<THREE.Points | null>(null);
  const [countries, setCountries] = useState<any>({ features: [] });
  const [hoveredPin, setHoveredPin] = useState<{ dc: Datacenter; sx: number; sy: number } | null>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const isTouch = useIsTouch();

  // Unlit MeshBasicMaterial — no lighting calculations at all. Big perf win over
  // MeshPhysicalMaterial (no clearcoat pass, no per-fragment specular/diffuse).
  // We lose the wet-glass sheen but the dark globe with country fills is still
  // visually solid.
  const customGlobeMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#13131a', // off-black globe surface, slightly cooler than the bg
      transparent: true,
      opacity: 0.85,
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
          controls.autoRotateSpeed = 0.25; // half the speed → less GPU churn
        } else {
          setTimeout(setRotation, 100);
        }
      }
    };
    setRotation();
  }, [isPaused]);

  // Minimal scene scaffolding — just the purple rim glow + one ambient light
  // for polygon shading. Dropped:
  //   • Cyan wireframe grid sphere (full extra draw call)
  //   • PointLight key + cyan fill (per-fragment lighting cost on polygons)
  // Atmosphere is still on via react-globe.gl's built-in showAtmosphere prop.
  useEffect(() => {
    if (!globeRef.current) return;
    const scene = globeRef.current.scene();
    if (!scene) return;

    const rimGeo = new THREE.SphereGeometry(100, 24, 24);
    const rimMat = new THREE.MeshBasicMaterial({
      color: '#8b5cf6',
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.scale.set(1.05, 1.05, 1.05);
    scene.add(rimMesh);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    return () => {
      scene.remove(rimMesh);
      scene.remove(ambientLight);
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
  /**
   * Datacenter pin layer — 📍 emoji rendered via THREE.Points.
   *
   * Positioning is static (no reactive transforms). Each pin sits at a fixed
   * radius just above the polygon cap. We attach the layer directly to the
   * scene so it stays aligned with three-globe's internal coordinate frame.
   *
   * Back-of-globe culling: a custom vertex shader (injected via
   * onBeforeCompile) computes the dot product of each pin's outward direction
   * with the camera direction. Pins on the far hemisphere are discarded by
   * the fragment shader, so the see-through globe doesn't reveal them.
   *
   * Single THREE.Points mesh, one draw call, billboarded.
   */
  useEffect(() => {
    if (!globeRef.current) return;
    const scene = globeRef.current.scene();
    if (!scene) return;
    if (datacenters.length === 0) return;

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
      depthTest: true,
      depthWrite: false,
      sizeAttenuation: true,
    });

    // Inject hemisphere-visibility test into the shader. Pins whose outward
    // direction points away from the camera are discarded so back-of-globe
    // pins don't bleed through the semi-transparent sphere.
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = `
        varying float vVisible;
        ${shader.vertexShader}
      `.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vec3 outward = normalize(worldPos);
        vec3 toCamera = normalize(cameraPosition - vec3(0.0));
        vVisible = dot(outward, toCamera);
        `
      );
      shader.fragmentShader = `
        varying float vVisible;
        ${shader.fragmentShader}
      `.replace(
        'void main() {',
        `void main() {
          if (vVisible < 0.0) discard;
        `
      );
    };

    const pinsMesh = new THREE.Points(geometry, material);
    pinsMesh.frustumCulled = false;

    // Move pins to a separate raycast layer so react-globe.gl's raycaster
    // (default layer 0) doesn't intercept clicks meant for the country polygons.
    // ALSO enable layer 1 on the camera so the pins still render (three.js
    // cameras only render objects on layers they have enabled).
    pinsMesh.layers.set(PIN_RAYCAST_LAYER);
    const camera = globeRef.current.camera?.();
    if (camera) camera.layers.enable(PIN_RAYCAST_LAYER);

    scene.add(pinsMesh);
    pinsMeshRef.current = pinsMesh;

    return () => {
      scene.remove(pinsMesh);
      geometry.dispose();
      material.dispose();
      texture.dispose();
      pinsMeshRef.current = null;
    };
  }, [datacenters]);

  /**
   * Custom raycaster for pin hover. Layer-isolated so we don't compete with
   * react-globe.gl's polygon raycaster. RAF-throttled so the hover state
   * updates at most once per frame.
   *
   * After a raycast hit, we re-check the hemisphere (same logic as the shader)
   * so we don't "hover" a pin on the back of the globe that's not visible.
   */
  useEffect(() => {
    if (!globeRef.current) return;
    if (datacenters.length === 0) return;
    // Skip the per-pin raycaster on touch devices — there's no hover concept,
    // and the raycaster would otherwise fire on every drag/scroll touch event.
    if (isTouch) return;
    const renderer = globeRef.current.renderer?.();
    const camera = globeRef.current.camera?.();
    if (!renderer || !camera) return;
    const canvas: HTMLCanvasElement = renderer.domElement;

    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(PIN_RAYCAST_LAYER);
    raycaster.params.Points = { threshold: 0.9 };
    const ndc = new THREE.Vector2();

    let rafId = 0;
    let lastEvent: PointerEvent | null = null;

    const tick = () => {
      rafId = 0;
      if (!lastEvent || !pinsMeshRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const cx = lastEvent.clientX - rect.left;
      const cy = lastEvent.clientY - rect.top;
      ndc.x = (cx / rect.width) * 2 - 1;
      ndc.y = -(cy / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObject(pinsMeshRef.current, false);

      let found: { dc: Datacenter; sx: number; sy: number } | null = null;
      for (const hit of hits) {
        // Hemisphere check — back-of-globe pins are invisible (shader discards
        // them) so we shouldn't allow hovering them.
        const outward = hit.point.clone().normalize();
        const toCam = camera.position.clone().normalize();
        if (outward.dot(toCam) > 0 && hit.index !== undefined) {
          found = { dc: datacenters[hit.index], sx: cx, sy: cy };
          break;
        }
      }
      setHoveredPin((prev) => {
        if (prev?.dc === found?.dc && prev?.sx === found?.sx && prev?.sy === found?.sy) return prev;
        return found;
      });
    };

    const onPointerMove = (e: PointerEvent) => {
      lastEvent = e;
      if (!rafId) rafId = requestAnimationFrame(tick);
    };
    const onPointerLeave = () => {
      lastEvent = null;
      setHoveredPin(null);
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    return () => {
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [datacenters, isTouch]);

  const polygonBaseColorMap = useMemo(() => {
    const map = new WeakMap<object, string>();
    for (const f of countries.features) {
      const stat = countryStats.get(featureName(f));
      map.set(f, BUCKET_COLORS[bucketFor(stat?.count ?? 0)]);
    }
    return map;
  }, [countries, countryStats]);

  // Static color per polygon — no hover-white anymore. This means react-globe.gl
  // doesn't have to re-evaluate all 177 polygons + interpolate colors over
  // 300ms on every mouse-into-new-country event. Cursor still changes + the
  // polygon-label tooltip surfaces on hover; click feedback is the flat-map view.
  const polygonCapColor = useCallback(
    (d: any) => polygonBaseColorMap.get(d) || BUCKET_COLORS.none,
    [polygonBaseColorMap]
  );

  // Polygon altitude is constant — no hover lift. Hover feedback is the
  // color flash to white only.
  const polygonAltitude = useCallback(() => POLYGON_ALT, []);

  const polygonSideColor = useCallback(() => 'rgba(0, 0, 0, 0.5)', []);
  const polygonStrokeColor = useCallback(() => '#111111', []);

  // We don't react to polygon hover anymore — polygon colors are static and the
  // built-in polygonLabel tooltip surfaces info on hover without needing React
  // state updates. Avoiding setHoverD prevents a re-render on every new
  // country-under-cursor event.
  const handlePolygonHover = useCallback(() => {}, []);

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
        <div class="bg-[#0c0c0e]/85 backdrop-blur-md border border-white/20 p-2.5 rounded text-white font-mono text-xs shadow-lg pointer-events-none min-w-[220px]">
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
    <div className="relative w-full h-screen bg-[#0c0c0e] cursor-crosshair">
      {hoveredPin && (
        <div
          className="absolute z-40 pointer-events-none bg-[#0c0c0e]/90 backdrop-blur-md border border-white/15 rounded px-3 py-2 shadow-xl"
          style={{
            left: Math.min(hoveredPin.sx + 14, windowSize.width - 280),
            top: Math.max(8, hoveredPin.sy - 8),
            minWidth: 220,
            maxWidth: 280,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
          }}
        >
          <div className="font-sans font-semibold text-sm text-white leading-tight">
            {hoveredPin.dc.name}
          </div>
          <div className="text-[#facc15] mt-0.5 truncate">{hoveredPin.dc.company}</div>
          {hoveredPin.dc.city && (
            <div className="text-white/55 mt-0.5 truncate">
              {[hoveredPin.dc.city, hoveredPin.dc.state, hoveredPin.dc.country]
                .filter(Boolean)
                .join(', ')}
            </div>
          )}
          {hoveredPin.dc.mw_current != null && (
            <div className="mt-1.5 pt-1.5 border-t border-white/10 flex items-center gap-1.5 text-[#facc15]">
              <span>⚡</span>
              <span>{hoveredPin.dc.mw_current} MW</span>
              {hoveredPin.dc.mw_planned_max != null &&
                hoveredPin.dc.mw_planned_max !== hoveredPin.dc.mw_current && (
                  <span className="text-white/45">/ {hoveredPin.dc.mw_planned_max} planned</span>
                )}
            </div>
          )}
        </div>
      )}
      <GlobeGL
        ref={globeRef}
        width={windowSize.width}
        height={windowSize.height}
        backgroundColor="#0c0c0e"
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
        polygonsTransitionDuration={0}
        showAtmosphere={true}
        atmosphereColor="#8b5cf6"
        atmosphereAltitude={0.15}
      />
    </div>
  );
};

export default Globe;
