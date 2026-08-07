import type { NextConfig } from 'next';

/**
 * The globe ships ~10 MB of static geodata from /public — the facility
 * inventory, submarine cables, power plants and country borders. Next serves
 * files in /public with no caching directive, so every visit re-downloads all
 * of it. These headers let the CDN hold them and let browsers reuse them.
 *
 * Not `immutable`: the payloads are regenerated in place (see
 * scripts/enrich_datacenters.py), so a client that never revalidates would be
 * pinned to stale data. Instead the CDN keeps a copy for a day and may serve
 * it stale for a week while it fetches a fresh one in the background.
 */
const DATA_CACHE =
  'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

const DATA_FILES = [
  'datacenters.json',
  'cables.json',
  'powerplants.json',
  'countries-110m.geojson',
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Applied to every route. The globe is a self-contained WebGL page —
        // it embeds nothing and is embedded by nothing — so the framing and
        // sniffing protections cost it nothing.
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            // Geolocation is same-origin only, for the "closest to me" panel.
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
          },
        ],
      },
      ...DATA_FILES.map((file) => ({
        source: `/${file}`,
        headers: [{ key: 'Cache-Control', value: DATA_CACHE }],
      })),
    ];
  },
};

export default nextConfig;
