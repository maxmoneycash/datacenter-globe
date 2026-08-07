# Deploying

The app is a standard Next.js 16 build with no server-side state, no database
and no environment variables required to boot. Everything it serves lives in
`public/`. That makes it deployable to any Node host or static-ish platform;
Vercel is what the metadata already points at.

## Preflight

Everything CI runs, in one line:

```bash
npm ci && npx tsc --noEmit && npm test && npm run build && npm run validate:data
```

All five must pass before a deploy. `validate:data` is the one people forget —
it asserts the geocoding invariants, and it is the only thing standing between
a bad `enrich_datacenters.py` run and a map full of pins in the ocean.

## Vercel

```bash
npm i -g vercel
vercel login
vercel link          # first time only
vercel --prod
```

Framework detection handles the rest — no `vercel.json` is needed, and the
cache and security headers come from `next.config.ts` so they apply on any
host, not just this one.

### Environment variables

None are required. One is worth setting:

| Variable | Why |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Absolute base for OG/Twitter card images. Set it to your custom domain once you have one, e.g. `https://datacenters.example.com`. |

Without it the app falls back to `VERCEL_PROJECT_PRODUCTION_URL`, which Vercel
injects automatically, and then to `https://datacenter-globe.vercel.app`. Social
cards will point at whichever of those wins, so set it if the domain matters.

## Any Node host

```bash
npm ci && npm run build
npm start            # serves on $PORT, default 3000
```

Node 22 or newer. The `npm test` script relies on Node's native TypeScript
stripping, so an older Node will build and run fine but cannot run the tests.

## What to check after deploying

1. `/` redirects to `/globe`.
2. The globe renders pins — roughly 200 at world zoom, more as you zoom in.
   An empty globe means `datacenters.json` failed to load.
3. Caching is live:
   ```bash
   curl -sI https://<your-domain>/datacenters.json | grep -i cache-control
   # public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800
   ```
   This matters more than it looks: the app ships ~10 MB of geodata and
   without the CDN holding it, every visitor re-downloads all of it.
4. Security headers are present on an HTML route:
   ```bash
   curl -sI https://<your-domain>/globe | grep -iE 'x-frame|x-content|referrer|permissions'
   ```

## Regenerating the dataset

Not part of a deploy — `public/datacenters.json` is committed. When upstream
publishes new facilities:

```bash
python3 scripts/enrich_datacenters.py   # rewrites public/datacenters.json
npm run validate:data                   # must pass before committing
```

The script is idempotent and preserves hand-curated rows. It downloads ~15 MB
of GeoNames gazetteers into `.cache/` on first run.

## A note on the word "mainnet"

There is no blockchain in this project — no contracts, no wallet, no chain
RPC, and no web3 dependencies. If "deploy to mainnet" meant "deploy to
production", this document is that. If it meant adding an on-chain component,
that is a new feature and needs scoping first.
