/**
 * How accurately a facility's coordinate is actually known.
 *
 * The upstream inventory lists ~18k data centers but only ships coordinates
 * for a third of them, and the ones it does ship are city centroids rather
 * than building locations. We resolve the rest offline (see
 * scripts/enrich_datacenters.py) and label every coordinate with the method
 * that produced it, so the globe can be honest about what it is drawing
 * instead of implying survey accuracy it does not have.
 */
export type Precision = 'site' | 'postal' | 'city' | 'state' | 'country';

export const PRECISION_ORDER: Precision[] = ['site', 'postal', 'city', 'state', 'country'];

export const PRECISION_LABEL: Record<Precision, string> = {
  site: 'Site',
  postal: 'Postal code',
  city: 'City',
  state: 'Region',
  country: 'Country',
};

/** Human-readable accuracy, shown next to the coordinate in the detail panel. */
export const PRECISION_DETAIL: Record<Precision, string> = {
  site: 'Verified building location',
  postal: 'Postal-code centroid (±few km)',
  city: 'City centroid (±10–25 km)',
  state: 'Region centroid — approximate',
  country: 'Country centroid — approximate',
};

export const PRECISION_COLOR: Record<Precision, string> = {
  site: '#4ade80',
  postal: '#22d3ee',
  city: '#ff9f43',
  state: '#a78bfa',
  country: '#f87171',
};

/**
 * Region- and country-centroid facilities are real facilities, but their
 * coordinates are a guess at national scale — thousands of them collapse onto
 * a single point. They are opt-in so the globe never invents a hotspot.
 */
export const APPROXIMATE: Precision[] = ['state', 'country'];

export function isApproximate(p?: Precision | null): boolean {
  return !p || APPROXIMATE.includes(p);
}
