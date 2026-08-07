#!/usr/bin/env python3
"""
Rebuild public/datacenters.json with coordinates resolved for as many
facilities as possible.

The upstream ATLAS dataset ships coordinates for only ~34% of its 18k
facilities, so two thirds of the world's data centers never render on the
globe. This script resolves the rest offline against GeoNames and records how
precise each fix actually is, so the UI can be honest about it.

Resolution ladder, best first:

  postal   US ZIP centroid          (tightest — sub-city)
  city     city centroid            (upstream coords, or GeoNames match)
  state    admin1 population centre
  country  country population centre

Sources
  Facilities  (c) Ringmast4r - Global-Data-Center-Map (attribution licence)
              https://github.com/Ringmast4r/Global-Data-Center-Map
  Gazetteer   GeoNames, CC BY 4.0 - https://www.geonames.org/

Usage:  python3 scripts/enrich_datacenters.py
"""

from __future__ import annotations

import io
import json
import os
import re
import sys
import urllib.request
import zipfile
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, ".cache", "gazetteer")
OUT = os.path.join(ROOT, "public", "datacenters.json")

MAX_PASSES = 8

ATLAS = "https://raw.githubusercontent.com/Ringmast4r/Global-Data-Center-Map/main/"
GEONAMES = "https://download.geonames.org/export/"


# --------------------------------------------------------------------------
# fetching
# --------------------------------------------------------------------------

def fetch(url: str, name: str) -> bytes:
    """Download to the local cache once, then reuse."""
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, name)
    if os.path.exists(path) and os.path.getsize(path) > 0:
        with open(path, "rb") as fh:
            return fh.read()
    print(f"  downloading {name} ...", flush=True)
    with urllib.request.urlopen(url, timeout=300) as resp:
        blob = resp.read()
    with open(path, "wb") as fh:
        fh.write(blob)
    return blob


def fetch_zip_member(url: str, name: str, member: str) -> str:
    blob = fetch(url, name)
    with zipfile.ZipFile(io.BytesIO(blob)) as zf:
        return zf.read(member).decode("utf-8")


# --------------------------------------------------------------------------
# normalisation
# --------------------------------------------------------------------------

def norm(s: str | None) -> str:
    """Loose key for matching place names across sources."""
    if not s:
        return ""
    s = s.lower()
    # strip accents cheaply — GeoNames ships ASCII names alongside UTF-8 ones
    s = (s.replace("ä", "a").replace("ö", "o").replace("ü", "u").replace("ß", "ss")
          .replace("é", "e").replace("è", "e").replace("ê", "e").replace("ç", "c")
          .replace("á", "a").replace("à", "a").replace("â", "a").replace("ñ", "n")
          .replace("í", "i").replace("ó", "o").replace("ú", "u").replace("å", "a")
          .replace("ø", "o").replace("æ", "ae"))
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


# Dataset country spellings that GeoNames names differently.
COUNTRY_ALIASES = {
    "united states": "US", "usa": "US", "u s a": "US", "united states of america": "US",
    "united kingdom": "GB", "uk": "GB", "great britain": "GB", "england": "GB",
    "scotland": "GB", "wales": "GB", "northern ireland": "GB",
    "russia": "RU", "south korea": "KR", "north korea": "KP",
    "vietnam": "VN", "viet nam": "VN", "taiwan": "TW", "hong kong": "HK",
    "macau": "MO", "macao": "MO", "czech republic": "CZ", "czechia": "CZ",
    "slovakia": "SK", "moldova": "MD", "bolivia": "BO", "venezuela": "VE",
    "iran": "IR", "syria": "SY", "tanzania": "TZ", "laos": "LA",
    "brunei": "BN", "cape verde": "CV", "ivory coast": "CI", "cote d ivoire": "CI",
    "democratic republic of the congo": "CD", "republic of the congo": "CG",
    "congo": "CG", "united arab emirates": "AE", "uae": "AE",
    "palestine": "PS", "swaziland": "SZ", "eswatini": "SZ",
    "myanmar": "MM", "burma": "MM", "east timor": "TL", "timor leste": "TL",
    "north macedonia": "MK", "macedonia": "MK", "turkey": "TR", "turkiye": "TR",
    "curacao": "CW", "reunion": "RE", "netherlands antilles": "AN",
    "south africa": "ZA", "new zealand": "NZ", "saudi arabia": "SA",
    "puerto rico": "PR", "dominican republic": "DO", "costa rica": "CR",
    # Non-English spellings that appear in the upstream country field
    "republica dominicana": "DO", "chipre": "CY", "brasil": "BR",
    "espana": "ES", "espanha": "ES", "deutschland": "DE", "italia": "IT",
    "belgie": "BE", "belgique": "BE", "nederland": "NL", "osterreich": "AT",
    "suisse": "CH", "schweiz": "CH", "svizzera": "CH", "polska": "PL",
    "mexico": "MX", "peru": "PE", "japon": "JP", "grecia": "GR",
    "sudafrica": "ZA", "la reunion": "RE", "irlanda": "IE", "suecia": "SE",
    # Official long forms GeoNames lists under a short name
    "russian federation": "RU", "republic of korea": "KR", "korea republic of": "KR",
    "republic of china": "TW", "peoples republic of china": "CN",
    "kingdom of saudi arabia": "SA", "state of israel": "IL",
    "united mexican states": "MX", "kingdom of the netherlands": "NL",
    "swiss confederation": "CH", "hellenic republic": "GR",
    "czechoslovakia": "CZ", "holland": "NL", "u k": "GB", "u s": "US",
    "el salvador": "SV", "trinidad and tobago": "TT", "sri lanka": "LK",
}


def resolve_iso2(rec, iso: dict[str, str]) -> str:
    """
    Best-effort ISO2 for a record whose `country` field may be unusable.

    Upstream's country column is free text, and a slice of it holds postal
    codes, street lines or localised names. Every geocoding step below is
    gated on knowing the country, so a junk value here does not just mislabel
    a row — it stops that row being placed on the map at all. Hence the
    fallbacks: strip a trailing postcode, then walk the address tail.
    """
    raw = rec.get("country") or ""
    hit = iso.get(norm(raw))
    if hit:
        return hit

    # "Taiwan 220" / "Singapore 609934" — a country with a postcode glued on.
    stripped = re.sub(r"[\s,]*\d[\d\s-]*$", "", raw).strip()
    hit = iso.get(norm(stripped))
    if hit:
        return hit

    # Fall back to the address tail: the last comma-separated parts are
    # nearly always "<city>, <region>, <country>".
    for tok in reversed(address_tokens(rec.get("address") or "")[-3:]):
        tok = re.sub(r"[\s,]*\d[\d\s-]*$", "", tok).strip()
        hit = iso.get(norm(tok))
        if hit:
            return hit
    return ""


def build_country_index(country_info: str) -> dict[str, str]:
    """normalised country name -> ISO2."""
    idx: dict[str, str] = {}
    for line in country_info.splitlines():
        if line.startswith("#") or not line.strip():
            continue
        f = line.split("\t")
        if len(f) < 5:
            continue
        iso2, name = f[0], f[4]
        idx.setdefault(norm(name), iso2)
        idx.setdefault(norm(iso2), iso2)
    idx.update(COUNTRY_ALIASES)
    return idx


# --------------------------------------------------------------------------
# gazetteer construction
# --------------------------------------------------------------------------

def build_gazetteers(cities_tsv: str, admin1_tsv: str):
    """Return (city index, admin1-keyed city index, admin1, admin1 names, country centroids)."""
    # (iso2, normalised city) -> (lat, lon); keep the most populous match
    cities: dict[tuple[str, str], tuple[float, float, int]] = {}
    # (iso2, admin1, city) -> coords; disambiguates repeated US town names
    cities_admin: dict[tuple[str, str, str], tuple[float, float, int]] = {}
    # population-weighted accumulators
    admin_acc: dict[str, list[float]] = defaultdict(lambda: [0.0, 0.0, 0.0])
    country_acc: dict[str, list[float]] = defaultdict(lambda: [0.0, 0.0, 0.0])

    for line in cities_tsv.splitlines():
        f = line.split("\t")
        if len(f) < 15:
            continue
        name, ascii_name, alt = f[1], f[2], f[3]
        try:
            lat, lon = float(f[4]), float(f[5])
            pop = int(f[14] or 0)
        except ValueError:
            continue
        iso2, admin1 = f[8], f[10]

        # weight by population so centroids land where people (and racks) are
        w = max(pop, 1)
        if admin1:
            acc = admin_acc[f"{iso2}.{admin1}"]
            acc[0] += lat * w
            acc[1] += lon * w
            acc[2] += w
        acc = country_acc[iso2]
        acc[0] += lat * w
        acc[1] += lon * w
        acc[2] += w

        names = {name, ascii_name}
        # alternate names catch "Frankfurt am Main" vs "Frankfurt"
        names.update(a for a in alt.split(",")[:6] if a)
        for n in names:
            key = (iso2, norm(n))
            if not key[1]:
                continue
            prev = cities.get(key)
            if prev is None or pop > prev[2]:
                cities[key] = (lat, lon, pop)
            if admin1:
                akey = (iso2, admin1, key[1])
                aprev = cities_admin.get(akey)
                if aprev is None or pop > aprev[2]:
                    cities_admin[akey] = (lat, lon, pop)

    admin1: dict[str, tuple[float, float]] = {}
    for code, (slat, slon, sw) in admin_acc.items():
        if sw:
            admin1[code] = (slat / sw, slon / sw)

    countries: dict[str, tuple[float, float]] = {}
    for iso2, (slat, slon, sw) in country_acc.items():
        if sw:
            countries[iso2] = (slat / sw, slon / sw)

    # admin1 name -> code, so "Virginia" resolves to US.VA
    admin1_names: dict[tuple[str, str], str] = {}
    for line in admin1_tsv.splitlines():
        f = line.split("\t")
        if len(f) < 3:
            continue
        code, name, ascii_name = f[0], f[1], f[2]
        iso2 = code.split(".")[0]
        for n in (name, ascii_name):
            if norm(n):
                admin1_names.setdefault((iso2, norm(n)), code)
        # US rows sometimes carry the postal abbreviation instead
        admin1_names.setdefault((iso2, norm(code.split(".")[-1])), code)

    return cities, cities_admin, admin1, admin1_names, countries


def build_zip_index(us_tsv: str) -> dict[str, tuple[float, float]]:
    idx: dict[str, tuple[float, float]] = {}
    for line in us_tsv.splitlines():
        f = line.split("\t")
        if len(f) < 11:
            continue
        try:
            idx.setdefault(f[1].strip(), (float(f[9]), float(f[10])))
        except ValueError:
            continue
    return idx


# --------------------------------------------------------------------------
# free-text address parsing
# --------------------------------------------------------------------------

# "Ashburn, VA 20147" / "Boardman, OR 97818-1234"
US_STATE_ZIP = re.compile(r"^([A-Z]{2})\s+(\d{5})(?:-\d{4})?$")
US_ZIP_ONLY = re.compile(r"^(\d{5})(?:-\d{4})?$")
US_STATE_ONLY = re.compile(r"^([A-Z]{2})$")
# Leading or trailing postal codes attached to the town: "60489 Frankfurt am Main".
# The leading form must contain a digit. An earlier version allowed a pure
# [A-Z] run here, which silently ate the first word of any capitalised token —
# "STE 203" became "STE" and matched Ste, Wisconsin, planting a Chennai or
# Frankfurt facility in the US Midwest with a confident "city" precision.
# A wrong coordinate is worse than no coordinate, so the class now requires
# at least one digit while still allowing UK/CA/NL forms like "SW1A 1AA".
STRIP_POSTCODE = re.compile(
    r"^\s*(?=[\dA-Z]{2,8}\b)(?=[^\s]*\d)[\dA-Z]{2,8}(?:\s+[\dA-Z]{2,4})?\s+(?=[A-Za-z])"
    r"|\s+\d{3,8}\s*$"
)


def address_tokens(address: str) -> list[str]:
    """Comma-separated address parts, most-specific last, cleaned of noise."""
    parts = [p.strip() for p in (address or "").split(",")]
    return [p for p in parts if p]


def parse_us_address(tokens: list[str]) -> tuple[str, str]:
    """Return (zip5, state_code) recovered from a US address tail."""
    zip5 = state = ""
    for tok in tokens:
        m = US_STATE_ZIP.match(tok)
        if m:
            state, zip5 = m.group(1), m.group(2)
            continue
        if not zip5:
            m = US_ZIP_ONLY.match(tok)
            if m:
                zip5 = m.group(1)
        if not state:
            m = US_STATE_ONLY.match(tok)
            if m and m.group(1) not in {"US", "USA"}:
                state = m.group(1)
    return zip5, state


def city_candidates(tokens: list[str]) -> list[str]:
    """
    Address parts that could name a settlement, most-likely first.

    Addresses run street → district → city → region → country, so the city is
    usually near the end. We walk inward from the country end and let the
    gazetteer decide which candidate is real.
    """
    out: list[str] = []
    # Skip the final token (country) and walk backwards.
    for tok in reversed(tokens[:-1] if len(tokens) > 1 else tokens):
        cleaned = STRIP_POSTCODE.sub("", tok).strip()
        # Drop pure numbers, state+zip tails, and obvious street lines.
        if not cleaned or cleaned.isdigit():
            continue
        if US_STATE_ZIP.match(tok) or US_ZIP_ONLY.match(tok) or US_STATE_ONLY.match(tok):
            continue
        out.append(cleaned)
    return out[:4]


# --------------------------------------------------------------------------
# country repair
# --------------------------------------------------------------------------

def load_country_polygons(path: str):
    """
    Natural Earth borders as (name, bbox, polygons) for point-in-polygon tests.

    Deliberately the same file the globe renders, so a repaired country name is
    guaranteed to match a polygon the map can actually colour in.
    """
    with open(path, encoding="utf-8") as fh:
        gj = json.load(fh)

    out = []
    for feat in gj.get("features", []):
        props = feat.get("properties") or {}
        name = props.get("ADMIN") or props.get("NAME") or props.get("admin")
        geom = feat.get("geometry") or {}
        if not name or not geom:
            continue
        if geom["type"] == "Polygon":
            polys = [geom["coordinates"]]
        elif geom["type"] == "MultiPolygon":
            polys = geom["coordinates"]
        else:
            continue

        min_x = min_y = 1e9
        max_x = max_y = -1e9
        for poly in polys:
            for x, y in poly[0]:
                min_x, max_x = min(min_x, x), max(max_x, x)
                min_y, max_y = min(min_y, y), max(max_y, y)
        out.append((name, (min_x, min_y, max_x, max_y), polys))
    return out


def _in_ring(x: float, y: float, ring) -> bool:
    """Standard ray-casting crossing count."""
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if (yi > y) != (yj > y):
            denom = yj - yi
            if denom and x < (xj - xi) * (y - yi) / denom + xi:
                inside = not inside
        j = i
    return inside


def country_at(lat: float, lon: float, polygons) -> str:
    """Country whose border contains this point, or '' if none does."""
    for name, (min_x, min_y, max_x, max_y), polys in polygons:
        if not (min_x <= lon <= max_x and min_y <= lat <= max_y):
            continue
        for poly in polys:
            if _in_ring(lon, lat, poly[0]):
                # Subtract holes (lakes, enclaves)
                if not any(_in_ring(lon, lat, hole) for hole in poly[1:]):
                    return name
    return ""


# --------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------

def main() -> int:
    print("Fetching sources ...")
    upstream = json.loads(fetch(ATLAS + "datacenters.json", "datacenters.json"))
    raw = json.loads(fetch(ATLAS + "datacenters_raw.json", "datacenters_raw.json"))

    # The committed file is the base, not upstream: it carries locally curated
    # rows (MW capacity, ultimate owner, source URLs) that upstream lacks.
    # Upstream only contributes rows we don't already have.
    facilities = []
    if os.path.exists(OUT):
        with open(OUT, encoding="utf-8") as fh:
            facilities = json.load(fh)

    def ident(r):
        # Deliberately NOT keyed on country: the repair pass below rewrites
        # that field, so a committed row would stop matching its upstream twin
        # and be re-added on the next run. `address` and `city` are carried
        # through untouched, which makes this key stable across runs.
        return (
            norm(r.get("name")),
            norm(r.get("company")),
            norm(r.get("address")) or norm(r.get("city")),
        )

    known = {ident(r) for r in facilities}
    added = []
    for r in upstream:
        key = ident(r)
        if key in known:
            continue
        # Record as we go, otherwise upstream's own duplicates all pass through.
        known.add(key)
        added.append(r)
    facilities += added
    print(f"  {len(facilities) - len(added)} local rows + {len(added)} new upstream rows")

    def as_coords(c):
        """Coerce a coordinate pair to floats, or None if it isn't usable."""
        if not isinstance(c, (list, tuple)) or len(c) != 2:
            return None
        try:
            lat, lon = float(c[0]), float(c[1])
        except (TypeError, ValueError):
            return None
        if not (-90 <= lat <= 90 and -180 <= lon <= 180) or (lat == 0 and lon == 0):
            return None
        return (round(lat, 4), round(lon, 4))

    cities_tsv = fetch_zip_member(
        GEONAMES + "dump/cities1000.zip", "cities1000.zip", "cities1000.txt")
    us_tsv = fetch_zip_member(GEONAMES + "zip/US.zip", "US.zip", "US.txt")
    admin1_tsv = fetch(
        GEONAMES + "dump/admin1CodesASCII.txt", "admin1.txt").decode("utf-8")
    country_tsv = fetch(
        GEONAMES + "dump/countryInfo.txt", "countryInfo.txt").decode("utf-8")

    print("Building gazetteers ...")
    iso = build_country_index(country_tsv)
    cities, cities_admin, admin1, admin1_names, countries = build_gazetteers(
        cities_tsv, admin1_tsv)
    zips = build_zip_index(us_tsv)
    print(f"  {len(cities)} city keys, {len(admin1)} admin1, "
          f"{len(countries)} countries, {len(zips)} US ZIPs")

    # Coordinates present in the pre-dedup collection but lost during dedup.
    by_name: dict[tuple[str, str], list] = {}
    for r in raw:
        c = as_coords(r.get("city_coords"))
        if c:
            by_name.setdefault((norm(r.get("name")), norm(r.get("country"))), c)

    # Cities the dataset already knows about, keyed the same way we key
    # GeoNames — this catches spellings GeoNames lists under another name.
    #
    # Rebuilt every pass: each pass places more facilities, which teaches this
    # map more city coordinates, which lets the next pass place more still.
    # Building it once meant a fresh run always had a richer map than any
    # in-process pass, so the file kept improving on every invocation and was
    # never actually at its fixed point.
    def build_donor_cities(rows):
        donor: dict[tuple[str, str], list] = {}
        for r in rows:
            c = as_coords(r.get("city_coords"))
            if c and r.get("city"):
                donor.setdefault((norm(r.get("city")), norm(r.get("country"))), c)
        return donor

    def zip5(z: str | None) -> str:
        return (z or "").strip().split("-")[0].zfill(5) if (z or "").strip() else ""

    # Repairing the country field changes what the geocoder can resolve on the
    # NEXT row set — a facility whose country was junk gets placed by address
    # fallback, then the repair gives it a real country, and only then can the
    # city lookup succeed. Running resolve-then-repair once therefore leaves
    # the file one pass short of its own fixed point, and a re-run would keep
    # improving it. Two passes reach the fixed point on this data; the loop
    # stops early when nothing moves so it stays honest if that changes.
    out: list = []
    stats: dict[str, int] = defaultdict(int)

    # Loop until the output stops changing, comparing the actual result rather
    # than a proxy signal — an earlier version counted "rows the repair
    # rewrote" and mistook a two-state oscillation for convergence. Comparing
    # the serialised output is the only condition that guarantees a re-run is
    # a no-op, which is the property this pipeline actually needs.
    previous = None
    for _pass in range(MAX_PASSES):
        stats = defaultdict(int)
        out = resolve_all(
            facilities, iso, cities, cities_admin, admin1, admin1_names,
            countries, zips, by_name, build_donor_cities(facilities + raw),
            as_coords, stats,
        )
        repair_countries(out, iso, as_coords, verbose=(_pass == 0))
        current = json.dumps(out, sort_keys=True, ensure_ascii=False)
        if current == previous:
            break
        previous = current
        # Feed the repaired countries back in for the next pass.
        facilities = out
    else:
        print(f"  WARNING: still changing after {MAX_PASSES} passes")

    print(f"  converged after {_pass + 1} pass(es)")
    return finish(out, stats)


# Upstream calls its coordinate field `city_coords` because that is what it
# holds: a city centroid. Only our own curated rows — the ones carrying a
# source URL that was checked by hand — are accurate to the building.
def is_surveyed(r) -> bool:
    return bool(r.get("source_url"))


def resolve_all(
    facilities, iso, cities, cities_admin, admin1, admin1_names,
    countries, zips, by_name, upstream_cities, as_coords, stats,
):
    def zip5(z: str | None) -> str:
        return (z or "").strip().split("-")[0].zfill(5) if (z or "").strip() else ""

    out = []
    for r in facilities:
        rec = dict(r)
        # Coordinates this script derived — on a previous run or a previous
        # pass — are recomputed from scratch. Without this, pass 2 would read
        # pass 1's country-centroid guess as if it were a source coordinate
        # and relabel it "city".
        if rec.pop("derived", False):
            rec.pop("city_coords", None)
        rec.pop("precision", None)
        r = rec
        country = r.get("country") or ""
        # Persisted so this decision is made once and never re-derived. The
        # country field gets rewritten by the repair below, which changes what
        # resolve_iso2 would answer next time — recomputing it made the whole
        # pipeline oscillate instead of converging. Reading it back also makes
        # a re-run a pure function of the committed file.
        iso2 = rec.get("country_iso") or resolve_iso2(r, iso)
        if iso2:
            rec["country_iso"] = iso2
        coords = None
        precision = None
        derived = True

        existing = as_coords(r.get("city_coords"))

        # A hand-checked site coordinate outranks every centroid below.
        if existing and is_surveyed(r):
            coords, precision, derived = existing, "site", False

        # 1. US ZIP centroid — tighter than any city centroid
        if coords is None and iso2 == "US":
            z = zip5(r.get("zip"))
            if z in zips:
                coords, precision = zips[z], "postal"

        # 2. the city centroid upstream already carries
        if coords is None and existing:
            coords, precision, derived = existing, "city", False

        # 3. a coordinate that existed pre-dedup for this same facility
        if coords is None:
            c = by_name.get((norm(r.get("name")), norm(country)))
            if c:
                coords, precision = c, "city"

        # 4. city centroid — GeoNames first, then upstream's own city table
        if coords is None and r.get("city"):
            hit = cities.get((iso2, norm(r.get("city"))))
            if hit:
                coords, precision = (hit[0], hit[1]), "city"
            else:
                c = upstream_cities.get((norm(r.get("city")), norm(country)))
                if c:
                    coords, precision = c, "city"

        # 5. Parse the free-text address. Thousands of rows carry a full
        #    postal address while leaving city/state/zip empty, so this is the
        #    difference between a real pin and a country centroid for them.
        if coords is None and r.get("address"):
            toks = address_tokens(r["address"])
            if iso2 == "US":
                z, st = parse_us_address(toks)
                if z in zips:
                    coords, precision = zips[z], "postal"
                elif st:
                    for cand in city_candidates(toks):
                        hit = cities_admin.get((iso2, st, norm(cand)))
                        if hit:
                            coords, precision = (hit[0], hit[1]), "city"
                            break
            if coords is None and iso2:
                for cand in city_candidates(toks):
                    hit = cities.get((iso2, norm(cand)))
                    if hit:
                        coords, precision = (hit[0], hit[1]), "city"
                        break

        # 6. state / admin1 centroid
        if coords is None and r.get("state") and iso2:
            code = admin1_names.get((iso2, norm(r.get("state"))))
            if code and code in admin1:
                coords, precision = admin1[code], "state"

        # 7. country centroid — last resort
        if coords is None and iso2 in countries:
            coords, precision = countries[iso2], "country"

        if coords is None:
            stats["unresolved"] += 1
            rec.pop("city_coords", None)
        else:
            rec["city_coords"] = [round(coords[0], 4), round(coords[1], 4)]
            rec["precision"] = precision
            if derived:
                rec["derived"] = True
            stats[precision] += 1

        out.append(rec)

    return out


def repair_countries(out, iso, as_coords, verbose: bool = True) -> int:
    """Canonicalise the country field. Returns how many rows changed.

    # ---------------------------------------------------------------
    # Repair the country field.
    #
    # Upstream's `country` is free text and a chunk of it is not a country at
    # all — postal codes ("111024"), street lines ("Улица Уборевича 8"),
    # city+postcode ("Taiwan 507"), or a non-English name ("Chipre",
    # "República Dominicana"). That is why the raw data reports 344 countries.
    # The globe keys its choropleth and its per-country stats off this string,
    # so every bad value is a phantom country in the UI.
    #
    # Rows whose country already resolves to a real ISO code are left alone.
    # The rest are relabelled from the Natural Earth polygon containing the
    # coordinate we just resolved — the same file the globe draws, so a
    # repaired name always matches a polygon that can be coloured in.
    # ---------------------------------------------------------------
    """
    # Canonical display name per ISO2, voted for by the rows that already
    # carry a clean country string. Those names are what the globe's polygon
    # matcher already agrees with, so reusing them keeps repaired rows
    # clickable rather than inventing a spelling nothing matches.
    name_votes: dict[str, Counter] = defaultdict(Counter)
    for rec in out:
        code = rec.get("country_iso")
        # Only rows whose country string is itself a recognisable country get
        # a vote — otherwise junk like "Taiwan 220" could win the ballot for TW.
        if code and iso.get(norm(rec.get("country"))) == code:
            name_votes[code][rec["country"]] += 1
    iso2_name = {code: votes.most_common(1)[0][0] for code, votes in name_votes.items()}

    borders = os.path.join(ROOT, "public", "countries-110m.geojson")
    polygons = load_country_polygons(borders) if os.path.exists(borders) else []

    by_code = by_polygon = unrepairable = 0
    for rec in out:
        # 1. Canonicalise against the resolved country code. This runs for
        #    every row, not just unrecognisable ones: "Svizzera", "Polska" and
        #    "Taiwán" all resolve to a valid code while still being a distinct
        #    string to the map, which is how one country becomes three
        #    entries in the country list.
        code = rec.get("country_iso") or ""
        canonical = iso2_name.get(code)
        if canonical:
            if rec.get("country") != canonical:
                rec["country"] = canonical
                by_code += 1
            continue

        # 2. Otherwise ask the borders themselves what is under the pin.
        c = as_coords(rec.get("city_coords"))
        name = country_at(c[0], c[1], polygons) if c and polygons else ""
        if name:
            # Route the polygon's own spelling through the same canonical table
            # the branch above uses. Natural Earth says "United States of
            # America" while the dataset says "United States"; emitting both
            # recreates exactly the split this repair exists to remove.
            polygon_code = iso.get(norm(name))
            if polygon_code:
                rec["country_iso"] = polygon_code
            rec["country"] = iso2_name.get(polygon_code, name) if polygon_code else name
            by_polygon += 1
        else:
            unrepairable += 1

    if verbose:
        print(f"\n  country field: {by_code} repaired by code, "
              f"{by_polygon} by borders, {unrepairable} still unusable")
    return by_code + by_polygon


def finish(out, stats) -> int:
    total = len(out)
    located = total - stats["unresolved"]
    print(f"\n  {total} facilities")
    for k in ("site", "postal", "city", "state", "country", "unresolved"):
        if stats[k]:
            print(f"    {k:<11} {stats[k]:>6}  ({100 * stats[k] / total:.1f}%)")
    print(f"  located: {located} ({100 * located / total:.1f}%)")

    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"\nWrote {OUT} ({os.path.getsize(OUT) / 1e6:.1f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
