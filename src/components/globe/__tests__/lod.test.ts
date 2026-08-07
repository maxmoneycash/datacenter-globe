import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_TIER,
  assignLodTiers,
  lodLevelForAltitude,
  visibleAtLevel,
} from '../lod.ts';
import type { Datacenter } from '../types.ts';

function dc(over: Partial<Datacenter> = {}): Datacenter {
  return {
    name: over.name ?? 'site',
    company: over.company ?? 'ACME',
    country: over.country ?? 'United States',
    city_coords: over.city_coords ?? [0, 0],
    ...over,
  } as Datacenter;
}

/** Spread points far enough apart that each owns its own tier-0 grid cell. */
function spread(n: number, over: Partial<Datacenter> = {}): Datacenter[] {
  return Array.from({ length: n }, (_, i) =>
    dc({ name: `site-${i}`, city_coords: [-60 + i * 9, -170 + i * 9], ...over })
  );
}

describe('lodLevelForAltitude', () => {
  test('world altitude shows only tier 0', () => {
    assert.equal(lodLevelForAltitude(2.5), 0);
  });

  test('level rises as the camera descends', () => {
    const far = lodLevelForAltitude(2.5);
    const mid = lodLevelForAltitude(1.0);
    const near = lodLevelForAltitude(0.4);
    assert.ok(mid > far, 'closer camera must reveal more');
    assert.ok(near > mid, 'closer still must reveal more again');
  });

  test('never exceeds MAX_TIER however close the camera gets', () => {
    for (const alt of [0.3, 0.1, 0.01, 1e-9]) {
      const lod = lodLevelForAltitude(alt);
      assert.ok(lod <= MAX_TIER, `altitude ${alt} produced ${lod}`);
    }
  });

  test('never goes negative above the world view', () => {
    for (const alt of [3, 10, 1000]) {
      assert.ok(lodLevelForAltitude(alt) >= 0);
    }
  });

  test('degenerate altitudes fall back to full detail rather than NaN', () => {
    // A NaN here would propagate into the shader uniform and blank the layer.
    for (const alt of [0, -1, NaN, Infinity]) {
      const lod = lodLevelForAltitude(alt as number);
      assert.ok(Number.isFinite(lod), `altitude ${alt} produced ${lod}`);
      assert.ok(lod >= 0 && lod <= MAX_TIER);
    }
  });

  test('reaches full detail by the closest altitude the globe allows', () => {
    // The camera bottoms out near 0.25; if the ramp cannot reach MAX_TIER
    // there, the deepest tier of pins is unreachable in the real UI.
    assert.ok(lodLevelForAltitude(0.25) >= MAX_TIER - 0.5);
  });
});

describe('assignLodTiers', () => {
  test('returns one tier per datacenter, in range', () => {
    const rows = spread(30);
    const tiers = assignLodTiers(rows);
    assert.equal(tiers.length, rows.length);
    for (const t of tiers) assert.ok(t >= 0 && t <= MAX_TIER);
  });

  test('handles an empty array', () => {
    assert.equal(assignLodTiers([]).length, 0);
  });

  test('is deterministic across runs', () => {
    // Non-determinism would make pins shimmer between renders.
    const rows = spread(40);
    assert.deepEqual(
      Array.from(assignLodTiers(rows)),
      Array.from(assignLodTiers(rows))
    );
  });

  test('does not depend on input order', () => {
    const rows = spread(24);
    const forward = assignLodTiers(rows);
    const reversed = assignLodTiers([...rows].reverse());
    const byName = new Map<string, number>();
    rows.forEach((r, i) => byName.set(r.name, forward[i]));
    [...rows].reverse().forEach((r, i) => {
      assert.equal(reversed[i], byName.get(r.name), `${r.name} changed tier`);
    });
  });

  test('promotes the more significant facility when two share a cell', () => {
    // Same coordinate, so they compete for one tier-0 slot.
    const rows = [
      dc({ name: 'small', city_coords: [40, -75] }),
      dc({ name: 'hyperscaler', city_coords: [40, -75], hyperscaler: 'AWS' }),
    ];
    const tiers = assignLodTiers(rows);
    assert.ok(
      tiers[1] < tiers[0],
      `hyperscaler tier ${tiers[1]} should beat ${tiers[0]}`
    );
  });

  test('prefers better coordinate precision as a tie-break', () => {
    const rows = [
      dc({ name: 'coarse', city_coords: [40, -75], precision: 'city' }),
      dc({ name: 'exact', city_coords: [40, -75], precision: 'site' }),
    ];
    const tiers = assignLodTiers(rows);
    assert.ok(tiers[1] < tiers[0]);
  });

  test('spreads tier 0 geographically rather than by density', () => {
    // 50 facilities crammed into one city plus a single far-away one. The
    // lone remote site must still survive at world zoom, or the map would
    // show only whichever region has the most rows.
    const cluster = Array.from({ length: 50 }, (_, i) =>
      dc({ name: `ashburn-${i}`, city_coords: [39.04 + i * 0.001, -77.49] })
    );
    const remote = dc({ name: 'lagos', city_coords: [6.52, 3.37] });
    const rows = [...cluster, remote];
    const tiers = assignLodTiers(rows);

    const remoteTier = tiers[tiers.length - 1];
    assert.equal(remoteTier, 0, 'isolated site must appear at world zoom');

    const clusterAtZero = Array.from(tiers.slice(0, 50)).filter((t) => t === 0).length;
    assert.equal(clusterAtZero, 1, 'a dense cluster gets one tier-0 pin, not 50');
  });

  test('rows without coordinates stay at the deepest tier', () => {
    const rows = [dc({ name: 'nowhere', city_coords: undefined })];
    assert.equal(assignLodTiers(rows)[0], MAX_TIER);
  });

  test('tolerates coordinates at the extremes of the range', () => {
    // Longitude exactly +180 must not index past the end of the grid row.
    const rows = [
      dc({ name: 'ne', city_coords: [90, 180] }),
      dc({ name: 'sw', city_coords: [-90, -180] }),
    ];
    const tiers = assignLodTiers(rows);
    for (const t of tiers) assert.ok(t >= 0 && t <= MAX_TIER);
  });
});

describe('visibleAtLevel', () => {
  test('is monotonic — zooming in never hides a pin', () => {
    const tiers = assignLodTiers(spread(60));
    let prev = -1;
    for (let lod = 0; lod <= MAX_TIER; lod += 0.5) {
      const n = visibleAtLevel(tiers, lod);
      assert.ok(n >= prev, `count fell from ${prev} to ${n} at lod ${lod}`);
      prev = n;
    }
  });

  test('reveals everything at max level', () => {
    const rows = spread(60);
    const tiers = assignLodTiers(rows);
    assert.equal(visibleAtLevel(tiers, MAX_TIER), rows.length);
  });

  test('shows strictly fewer than everything at world zoom', () => {
    // 400 facilities in one metro: the whole point is that world zoom is sparse.
    const rows = Array.from({ length: 400 }, (_, i) =>
      dc({ name: `s-${i}`, city_coords: [51.5 + (i % 20) * 0.01, -0.12 + i * 0.01] })
    );
    const tiers = assignLodTiers(rows);
    assert.ok(visibleAtLevel(tiers, 0) < rows.length);
  });
});
