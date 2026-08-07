/**
 * Level-of-detail for the pin layer.
 *
 * Drawing 11k pins at world zoom produces a solid smear over Virginia and
 * London and tells you nothing. Drawing 200 of them tells you where the
 * world's compute actually sits. So pins are assigned a tier, and the globe
 * reveals successive tiers as the camera comes in — the map gets denser as you
 * zoom, which is also how you'd read a paper atlas.
 *
 * The tiering is a stratified spatial sample rather than a plain "top N by
 * size": at each level the world is cut into a grid and only the single most
 * significant facility in each cell is promoted. That keeps the world view
 * geographically even (Lagos and São Paulo survive alongside Ashburn) instead
 * of collapsing to whichever region happens to have the most rows.
 *
 * The zoom-threshold approach is adapted from chip-sense's map label LOD
 * (src/lib/mapLabels.ts, MIT) — https://github.com/aminalav/chip-sense
 */
import type { Datacenter } from './types';

/** Number of reveal steps. Tier MAX_TIER is "only at full zoom". */
export const MAX_TIER = 6;

/** Grid cell size in degrees at tier 0; halves each tier. */
const BASE_CELL_DEG = 8;

/** Camera altitude at which tier 0 alone is shown (react-globe.gl units). */
const WORLD_ALTITUDE = 2.5;

/**
 * How fast tiers unlock per halving of altitude. Calibrated to the globe's
 * actual usable range — the camera bottoms out around altitude 0.25, roughly
 * 3.3 octaves below the world view, so this spreads all MAX_TIER steps across
 * that span and the last tier lands exactly at full zoom.
 */
const TIERS_PER_OCTAVE = 1.85;

/**
 * Significance score — decides which facility represents its grid cell.
 * Hyperscaler sites and known-capacity sites win, then coordinate quality,
 * so the sparse world view is made of places worth naming.
 */
function significance(d: Datacenter, operatorSize: Map<string, number>): number {
  let s = 0;
  if (d.hyperscaler) s += 1000;
  if (typeof d.mw_current === 'number') s += Math.min(d.mw_current, 500) * 2;
  switch (d.precision) {
    case 'site':
      s += 60;
      break;
    case 'postal':
      s += 25;
      break;
    case 'city':
      s += 12;
      break;
    default:
      break;
  }
  s += Math.min(operatorSize.get(d.company) ?? 0, 400) / 4;
  return s;
}

/**
 * Assign every datacenter a reveal tier in [0, MAX_TIER].
 *
 * Returns a Uint8Array parallel to the input array, so the caller can feed it
 * straight into a BufferAttribute without a second pass.
 */
export function assignLodTiers(datacenters: Datacenter[]): Uint8Array {
  const tiers = new Uint8Array(datacenters.length).fill(MAX_TIER);

  const operatorSize = new Map<string, number>();
  for (const d of datacenters) {
    operatorSize.set(d.company, (operatorSize.get(d.company) ?? 0) + 1);
  }

  // Most significant first; ties broken by name so the result is stable
  // across reloads and doesn't shimmer between renders.
  const order = datacenters
    .map((d, i) => ({ i, s: significance(d, operatorSize), n: d.name ?? '' }))
    .sort((a, b) => b.s - a.s || (a.n < b.n ? -1 : a.n > b.n ? 1 : a.i - b.i));

  const claimed = new Set<number>();

  for (let tier = 0; tier < MAX_TIER; tier++) {
    const cellDeg = BASE_CELL_DEG / 2 ** tier;
    const cols = Math.ceil(360 / cellDeg);
    const rows = Math.ceil(180 / cellDeg);
    const occupied = new Set<number>();

    for (const { i } of order) {
      if (claimed.has(i)) continue;
      const coords = datacenters[i].city_coords;
      if (!coords) continue;
      const [lat, lng] = coords;
      // Clamped: a point at exactly +90/+180 lands one cell past the end of
      // its axis, and the resulting index collides with the first cell of the
      // next row — two far-apart facilities would contend for one slot.
      const row = Math.min(Math.floor((lat + 90) / cellDeg), rows - 1);
      const col = Math.min(Math.floor((lng + 180) / cellDeg), cols - 1);
      const cell = row * cols + col;
      if (occupied.has(cell)) continue;
      occupied.add(cell);
      claimed.add(i);
      tiers[i] = tier;
    }
  }

  return tiers;
}

/**
 * Continuous LOD level for a camera altitude. Fractional on purpose — the
 * shader fades the newest tier in over its final unit so pins appear rather
 * than pop.
 */
export function lodLevelForAltitude(altitude: number): number {
  if (!Number.isFinite(altitude) || altitude <= 0) return MAX_TIER;
  const octaves = Math.log2(WORLD_ALTITUDE / altitude);
  return Math.max(0, Math.min(MAX_TIER, octaves * TIERS_PER_OCTAVE));
}

/**
 * Whether a tier is on screen at a given level.
 *
 * This MUST mirror the pin shader, which computes
 *   vFade = clamp(uLod - aTier + 1.0, 0.0, 1.0)
 * and discards when `vFade <= 0.01` — i.e. it draws every tier below
 * `level + 0.99`, including the one currently fading in.
 *
 * It lives here as one exported predicate because the count in the HUD, the
 * hover raycast and the shader all have to agree. When they were written
 * separately they disagreed by a whole tier: the readout said `tier <= level`
 * while the shader was already drawing the next tier in, so mid-zoom the user
 * saw about twice as many pins as the number claimed.
 */
export const FADE_WINDOW = 0.99;

export function isVisibleAtLevel(tier: number, level: number): boolean {
  return tier < level + FADE_WINDOW;
}

/** How many pins a given LOD level reveals — for the HUD readout. */
export function visibleAtLevel(tiers: Uint8Array, level: number): number {
  let n = 0;
  for (let i = 0; i < tiers.length; i++) if (isVisibleAtLevel(tiers[i], level)) n++;
  return n;
}
