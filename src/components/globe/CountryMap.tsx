'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { geoBounds } from 'd3-geo';
import type { Datacenter } from './types';

interface Props {
  countryFeature: any; // GeoJSON feature for the focused country
  datacenters: Datacenter[]; // Already filtered to this country
  width: number;
  height: number;
  selectedDc: Datacenter | null;
  hoverDc: Datacenter | null;
  onHover: (dc: Datacenter | null) => void;
  onSelect: (dc: Datacenter) => void;
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

    const map = new maplibregl.Map({
      container: containerRef.current,
      // CartoDB dark-matter style, free + open. Looks great on our theme.
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-no-labels-gl-style/style.json',
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
