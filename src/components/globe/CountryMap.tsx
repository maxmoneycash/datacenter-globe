'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { geoBounds } from 'd3-geo';
import type { Datacenter } from './types';
import { CLOUD_REGIONS, CLOUD_COLORS, type CloudProvider } from './cloudRegions';
import { FUEL_COLORS, type PowerPlant } from './powerplants';

interface Props {
  countryFeature: any; // GeoJSON feature for the focused country
  datacenters: Datacenter[]; // Already filtered to this country
  width: number;
  height: number;
  selectedDc: Datacenter | null;
  hoverDc: Datacenter | null;
  onHover: (dc: Datacenter | null) => void;
  onSelect: (dc: Datacenter) => void;
  // Overlay layers (visible across the globe AND inside the country view)
  cables?: any | null;
  powerPlants?: PowerPlant[] | null;
  shownClouds?: Set<CloudProvider>;
}

const COLOR_PRIMARY = '#ff9f43';
const COLOR_ACTIVE = '#facc15';
const COLOR_BG = '#0c0c0e';

/**
 * Dark interactive country map powered by MapLibre + CartoDB dark tiles
 * (free, no API key). Country outline glows orange; datacenters cluster when
 * dense and split into individual pins as you zoom in. Pinch/drag/scroll all
 * native. Animates the camera on country mount + on pin select.
 */
const CountryMap: React.FC<Props> = ({
  countryFeature,
  datacenters,
  width,
  height,
  selectedDc,
  hoverDc,
  onHover,
  onSelect,
  cables,
  powerPlants,
  shownClouds,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onHoverRef = useRef(onHover);
  const onSelectRef = useRef(onSelect);
  const datacentersRef = useRef(datacenters);

  // Stash latest callbacks/data so the map's event handlers always see fresh values.
  useEffect(() => {
    onHoverRef.current = onHover;
    onSelectRef.current = onSelect;
    datacentersRef.current = datacenters;
  }, [onHover, onSelect, datacenters]);

  // Build the GeoJSON for the datacenter points. We attach the array index as
  // the feature id so we can resolve clicks back to the original Datacenter.
  const pointsGeojson = useMemo<GeoJSON.FeatureCollection>(() => {
    return {
      type: 'FeatureCollection',
      features: datacenters
        .filter((d) => d.city_coords)
        .map((d, i) => ({
          type: 'Feature',
          id: i,
          geometry: {
            type: 'Point',
            coordinates: [d.city_coords![1], d.city_coords![0]], // [lng, lat]
          },
          properties: {
            idx: i,
            name: d.name,
            company: d.company,
            mw: d.mw_current ?? null,
          },
        })),
    };
  }, [datacenters]);

  // Initialise the map once on mount.
  useEffect(() => {
    if (!containerRef.current) return;

    // CartoDB raster dark tiles — CORS-friendly (their vector style.json is NOT,
    // which is why the previous URL-based approach silently failed). Raster is
    // marginally less crisp than vector but works everywhere with zero config.
    const rasterStyle = {
      version: 8 as const,
      sources: {
        'carto-dark': {
          type: 'raster' as const,
          tiles: [
            'https://a.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
            'https://b.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
            'https://c.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
            'https://d.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution: '© CARTO · © OpenStreetMap contributors',
        },
        'carto-labels': {
          type: 'raster' as const,
          tiles: [
            'https://a.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png',
            'https://b.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png',
            'https://c.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png',
            'https://d.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
        },
      },
      layers: [
        { id: 'carto-dark', type: 'raster' as const, source: 'carto-dark' },
        { id: 'carto-labels', type: 'raster' as const, source: 'carto-labels', minzoom: 4 },
      ],
    };

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: rasterStyle,
      bounds: countryFeature ? (geoBounds(countryFeature) as any) : undefined,
      fitBoundsOptions: { padding: 40, duration: 0 },
      attributionControl: { compact: true },
      maxZoom: 17,
      minZoom: 1.5,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });

    map.touchZoomRotate.disableRotation();

    map.on('load', () => {
      // Country outline — glowing orange border
      if (countryFeature) {
        map.addSource('country', { type: 'geojson', data: countryFeature });
        map.addLayer({
          id: 'country-fill',
          type: 'fill',
          source: 'country',
          paint: {
            'fill-color': COLOR_PRIMARY,
            'fill-opacity': 0.04,
          },
        });
        map.addLayer({
          id: 'country-outline-glow',
          type: 'line',
          source: 'country',
          paint: {
            'line-color': COLOR_PRIMARY,
            'line-width': 6,
            'line-opacity': 0.25,
            'line-blur': 6,
          },
        });
        map.addLayer({
          id: 'country-outline',
          type: 'line',
          source: 'country',
          paint: {
            'line-color': COLOR_PRIMARY,
            'line-width': 1.2,
            'line-opacity': 0.9,
          },
        });
      }

      // Datacenter pins source — with clustering so dense areas (US/Europe)
      // don't collapse into an unreadable blob at low zoom.
      map.addSource('datacenters', {
        type: 'geojson',
        data: pointsGeojson,
        cluster: true,
        clusterMaxZoom: 11,
        clusterRadius: 38,
      });

      // Cluster bubbles
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'datacenters',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            COLOR_PRIMARY, 25,
            '#ff7b00',         100,
            '#ff4d4d',
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            16, 25,
            22, 100,
            30,
          ],
          'circle-opacity': 0.92,
          'circle-stroke-color': COLOR_BG,
          'circle-stroke-width': 2,
        },
      });
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'datacenters',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 12,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#000',
        },
      });

      // Individual datacenter pins (only shown when not clustered)
      map.addLayer({
        id: 'datacenter-pin-halo',
        type: 'circle',
        source: 'datacenters',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': COLOR_PRIMARY,
          'circle-radius': 14,
          'circle-opacity': 0.18,
          'circle-blur': 0.5,
        },
      });
      map.addLayer({
        id: 'datacenter-pin',
        type: 'circle',
        source: 'datacenters',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'case',
            ['boolean', ['feature-state', 'active'], false], COLOR_ACTIVE,
            ['boolean', ['feature-state', 'hover'], false], '#fff',
            COLOR_PRIMARY,
          ],
          'circle-radius': [
            'case',
            ['boolean', ['feature-state', 'active'], false], 8,
            ['boolean', ['feature-state', 'hover'], false], 7,
            5,
          ],
          'circle-stroke-color': COLOR_BG,
          'circle-stroke-width': 2,
          'circle-opacity': 1,
        },
      });

      // Cursor states
      map.on('mouseenter', 'datacenter-pin', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'datacenter-pin', () => {
        map.getCanvas().style.cursor = '';
        onHoverRef.current(null);
      });
      map.on('mouseenter', 'clusters', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'clusters', () => {
        map.getCanvas().style.cursor = '';
      });

      // Hover: set feature-state for paint highlight + call onHover
      let lastHoverId: number | string | null = null;
      map.on('mousemove', 'datacenter-pin', (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const id = f.id as number;
        if (id === lastHoverId) return;
        if (lastHoverId !== null) {
          map.setFeatureState({ source: 'datacenters', id: lastHoverId }, { hover: false });
        }
        map.setFeatureState({ source: 'datacenters', id }, { hover: true });
        lastHoverId = id;
        const dc = datacentersRef.current[id];
        if (dc) onHoverRef.current(dc);
      });

      // Pin click → select + flyTo
      map.on('click', 'datacenter-pin', (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const id = f.id as number;
        const dc = datacentersRef.current[id];
        if (!dc) return;
        onSelectRef.current(dc);
        map.flyTo({
          center: (f.geometry as GeoJSON.Point).coordinates as [number, number],
          zoom: Math.max(map.getZoom(), 9),
          duration: 700,
          essential: true,
        });
      });

      // Cluster click → zoom in
      map.on('click', 'clusters', (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const clusterId = (f.properties as any).cluster_id;
        const src = map.getSource('datacenters') as maplibregl.GeoJSONSource;
        Promise.resolve(src.getClusterExpansionZoom(clusterId))
          .then((zoom: number) => {
            map.easeTo({
              center: (f.geometry as GeoJSON.Point).coordinates as [number, number],
              zoom: Math.min(zoom + 0.3, 16),
              duration: 600,
            });
          })
          .catch(() => {});
      });

      // Overlay sources (initially empty; populated via setData below)
      map.addSource('cables-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer(
        {
          id: 'cables-glow',
          type: 'line',
          source: 'cables-src',
          paint: {
            'line-color': ['coalesce', ['get', 'color'], '#22d3ee'],
            'line-width': 3,
            'line-opacity': 0.25,
            'line-blur': 4,
          },
        },
        'country-outline-glow'
      );
      map.addLayer(
        {
          id: 'cables',
          type: 'line',
          source: 'cables-src',
          paint: {
            'line-color': ['coalesce', ['get', 'color'], '#22d3ee'],
            'line-width': 1.1,
            'line-opacity': 0.78,
          },
        },
        'country-outline'
      );

      map.addSource('plants-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer(
        {
          id: 'plants-halo',
          type: 'circle',
          source: 'plants-src',
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 6, 10, 12, 14, 20],
            'circle-opacity': 0.18,
            'circle-blur': 0.7,
          },
        },
        'datacenter-pin-halo'
      );
      map.addLayer(
        {
          id: 'plants',
          type: 'circle',
          source: 'plants-src',
          paint: {
            'circle-color': ['get', 'color'],
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 2.5, 10, 5, 14, 8],
            'circle-opacity': 0.92,
            'circle-stroke-color': COLOR_BG,
            'circle-stroke-width': 1,
          },
        },
        'datacenter-pin-halo'
      );

      map.addSource('clouds-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addLayer({
        id: 'clouds-halo',
        type: 'circle',
        source: 'clouds-src',
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': 12,
          'circle-opacity': 0.2,
          'circle-blur': 0.6,
        },
      });
      map.addLayer({
        id: 'clouds',
        type: 'circle',
        source: 'clouds-src',
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': 6,
          'circle-opacity': 0.95,
          'circle-stroke-color': '#fff',
          'circle-stroke-width': 1.4,
        },
      });
      map.addLayer({
        id: 'cloud-labels',
        type: 'symbol',
        source: 'clouds-src',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 10,
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#fff',
          'text-halo-color': COLOR_BG,
          'text-halo-width': 1.5,
        },
      });

      // Cinematic entry: fit to country bounds with smooth animation.
      if (countryFeature) {
        const bbox = geoBounds(countryFeature) as [[number, number], [number, number]];
        map.fitBounds(bbox, { padding: 60, duration: 900, essential: true });
      }
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push fresh GeoJSON whenever the datacenter list changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource('datacenters') as maplibregl.GeoJSONSource | undefined;
    if (src) src.setData(pointsGeojson);
  }, [pointsGeojson]);

  // ─── Overlay updates: cables, power plants, cloud regions ─────────────
  // Cables — push the global cables GeoJSON when toggled on, empty when off
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource('cables-src')) return;
    const src = map.getSource('cables-src') as maplibregl.GeoJSONSource;
    if (cables?.features) {
      src.setData(cables);
    } else {
      src.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [cables]);

  // Power plants — filter to country bounds for perf (~hundreds vs ~35,000)
  const plantsGeojson = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!powerPlants || powerPlants.length === 0 || !countryFeature) {
      return { type: 'FeatureCollection', features: [] };
    }
    const [[minLng, minLat], [maxLng, maxLat]] = geoBounds(countryFeature) as [
      [number, number],
      [number, number]
    ];
    // pad by 1° so coastal plants don't get clipped
    const pad = 1;
    const features = powerPlants
      .filter(
        (p) =>
          p.lng >= minLng - pad &&
          p.lng <= maxLng + pad &&
          p.lat >= minLat - pad &&
          p.lat <= maxLat + pad
      )
      .map((p) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
        properties: {
          name: p.n,
          fuel: p.f,
          mw: p.m,
          color: FUEL_COLORS[p.f] || FUEL_COLORS.Other,
        },
      }));
    return { type: 'FeatureCollection', features };
  }, [powerPlants, countryFeature]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource('plants-src')) return;
    (map.getSource('plants-src') as maplibregl.GeoJSONSource).setData(plantsGeojson);
  }, [plantsGeojson]);

  // Cloud regions — filter to enabled providers, also clipped to country bounds
  const cloudsGeojson = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!shownClouds || shownClouds.size === 0 || !countryFeature) {
      return { type: 'FeatureCollection', features: [] };
    }
    const [[minLng, minLat], [maxLng, maxLat]] = geoBounds(countryFeature) as [
      [number, number],
      [number, number]
    ];
    const pad = 2;
    const features = CLOUD_REGIONS.filter((r) => shownClouds.has(r.provider))
      .filter(
        (r) => r.lng >= minLng - pad && r.lng <= maxLng + pad && r.lat >= minLat - pad && r.lat <= maxLat + pad
      )
      .map((r) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [r.lng, r.lat] },
        properties: {
          label: `${r.provider} · ${r.code}`,
          color: CLOUD_COLORS[r.provider],
        },
      }));
    return { type: 'FeatureCollection', features };
  }, [shownClouds, countryFeature]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource('clouds-src')) return;
    (map.getSource('clouds-src') as maplibregl.GeoJSONSource).setData(cloudsGeojson);
  }, [cloudsGeojson]);

  // Reflect external selectedDc onto feature-state for the active paint
  const lastActiveIdRef = useRef<number | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const prev = lastActiveIdRef.current;
    if (prev !== null) {
      map.setFeatureState({ source: 'datacenters', id: prev }, { active: false });
    }
    if (selectedDc) {
      const idx = datacenters.indexOf(selectedDc);
      if (idx >= 0) {
        map.setFeatureState({ source: 'datacenters', id: idx }, { active: true });
        lastActiveIdRef.current = idx;
      } else {
        lastActiveIdRef.current = null;
      }
    } else {
      lastActiveIdRef.current = null;
    }
  }, [selectedDc, datacenters]);

  // Reflect external hoverDc (from the sidebar list) onto feature-state
  const lastSidebarHoverIdRef = useRef<number | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const prev = lastSidebarHoverIdRef.current;
    if (prev !== null) {
      map.setFeatureState({ source: 'datacenters', id: prev }, { hover: false });
    }
    if (hoverDc) {
      const idx = datacenters.indexOf(hoverDc);
      if (idx >= 0) {
        map.setFeatureState({ source: 'datacenters', id: idx }, { hover: true });
        lastSidebarHoverIdRef.current = idx;
      } else {
        lastSidebarHoverIdRef.current = null;
      }
    } else {
      lastSidebarHoverIdRef.current = null;
    }
  }, [hoverDc, datacenters]);

  // Keep map sized to its container
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.resize();
  }, [width, height]);

  return (
    <div
      ref={containerRef}
      style={{
        width,
        height,
        position: 'absolute',
        top: 0,
        left: 0,
        background: COLOR_BG,
      }}
    />
  );
};

export default CountryMap;
