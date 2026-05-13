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

// react-globe.gl uses a globe radius of 100 internally.
const GLOBE_RADIUS = 100;
const PIN_RADIUS = 0.45;     // size of each flat disc in world units
const PIN_OFFSET = 100.5;    // place dots just above the globe surface
const PIN_COLOR = '#d4d4d8'; // zinc-300

function featureName(d: any): string {
  return normalizeCountry(
    d?.properties?.ADMIN || d?.properties?.NAME || d?.properties?.name || d?.properties?.admin || ''
  );
}

// lat,lng → 3D position on a sphere of given radius. Same convention as
// react-globe.gl / three-globe so our overlay aligns perfectly with the
// underlying polygons.
function latLngToVec3(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -r * Math.sin(phi) * Math.cos(theta);
  const z = r * Math.sin(phi) * Math.sin(theta);
  const y = r * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
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
  const pinsMeshRef = useRef<THREE.InstancedMesh | null>(null);
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

  // Scene scaffolding (grid + rim + lights) — original Gini visualization look
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
   * Custom flat-disc pin layer. Owned by us (not react-globe.gl), so we have
   * total control over the material.
   *
   * Geometry: a real CircleGeometry → literally a 2D disc (no cylinder).
   * Material: depthTest = false + renderOrder = 1000 → always paints on
   *   top of polygons regardless of how high they lift on hover.
   * Instancing: one InstancedMesh holds all 5,700 pins → one draw call.
   *
   * Each instance is oriented so its disc face points outward from the globe
   * (i.e. tangent to the sphere at that lat/lng). We attach this to the same
   * scene the globe controls, so it auto-rotates and orbits with the globe.
   */
  useEffect(() => {
    if (!globeRef.current) return;
    const scene = globeRef.current.scene();
    if (!scene) return;
    if (datacenters.length === 0) return;

    // Find react-globe.gl's globe group so our pins rotate together with the
    // globe (auto-rotation, orbit controls). The globe.gl scene tree includes
    // a top-level group named "globe" or similar. We pick the first Group we
    // find that has Mesh children — that's the globe.
    let globeGroup: THREE.Object3D = scene;
    scene.traverse((obj: any) => {
      if (globeGroup !== scene) return;
      if (obj.isGroup && obj.children?.some((c: any) => c.isMesh)) {
        globeGroup = obj;
      }
    });

    const geometry = new THREE.CircleGeometry(PIN_RADIUS, 12);
    const material = new THREE.MeshBasicMaterial({
      color: PIN_COLOR,
      side: THREE.DoubleSide,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const mesh = new THREE.InstancedMesh(geometry, material, datacenters.length);
    mesh.renderOrder = 1000;
    mesh.frustumCulled = false;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < datacenters.length; i++) {
      const dc = datacenters[i];
      const [lat, lng] = dc.city_coords!;
      const pos = latLngToVec3(lat, lng, PIN_OFFSET);
      dummy.position.copy(pos);
      // CircleGeometry's default normal is +Z. lookAt(0,0,0) orients +Z
      // away from origin = outward from the globe. So the disc faces outward.
      dummy.lookAt(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;

    globeGroup.add(mesh);
    pinsMeshRef.current = mesh;

    return () => {
      globeGroup.remove(mesh);
      geometry.dispose();
      material.dispose();
      pinsMeshRef.current = null;
    };
  }, [datacenters]);

  // Polygon styling — original Gini visualization (lift + white on hover)
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
