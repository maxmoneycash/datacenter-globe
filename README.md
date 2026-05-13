# Datacenter Globe

Interactive 3D globe of ~18,000 datacenters worldwide. Click a country to fly into a 2D Mercator view of its sites; click a site to drop into a procedural 3D tour of an AI data center.

## Stack

- Next.js 16 (App Router) + React 19
- `react-globe.gl` (three.js wrapper) for the globe
- `d3-geo` for the country flat-map projection
- `framer-motion` for view transitions
- `@react-three/fiber` + `drei` + `postprocessing` for the in-site 3D tour
- Tailwind CSS v4 + Geist font

## Data sources

- 3D globe & general datacenter inventory: [Ringmast4r/Global-Data-Center-Map](https://github.com/Ringmast4r/Global-Data-Center-Map)
- Norway-specific metadata (MW, ultimate owner, status): [disi910/DataNorge](https://github.com/disi910/DataNorge)
- Country borders: Natural Earth `ne_110m_admin_0_countries`
- 3D datacenter tour scene: forked from [kaiiiichen/datacenter-tour](https://github.com/kaiiiichen/datacenter-tour)
- Initial visual reference: [Shahnab/Global-Inequality-3D](https://github.com/Shahnab/Global-Inequality-3D)

## Local dev

```bash
npm install
npm run dev
# open http://localhost:3000/globe
```

`/` redirects to `/globe`.

## Layout

```
app/
  globe/page.tsx     ← /globe route entry
  layout.tsx
  globals.css
  page.tsx           ← redirect to /globe
src/
  components/globe/  ← Globe, CountryPanel, Legend, FpsCounter, GlobeDashboard, GlobeClient
  tour/              ← Forked datacenter-tour scene + UI (75 files)
public/
  datacenters.json   ← 18,116 datacenter records
```
