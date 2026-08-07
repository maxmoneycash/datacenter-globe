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
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, ".cache", "gazetteer")
OUT = os.path.join(ROOT, "public", "datacenters.json")

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
    "el salvador": "SV", "trinidad and tobago": "TT", "sri lanka": "LK",
}


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
    """Return (city index, admin1 centroids, country centroids)."""
    # (iso2, normalised city) -> (lat, lon); keep the most populous match
    cities: dict[tuple[str, str], tuple[float, float, int]] = {}
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

    return cities, admin1, admin1_names, countries


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
        return (norm(r.get("name")), norm(r.get("company")), norm(r.get("country")))

    known = {ident(r) for r in facilities}
    added = [r for r in upstream if ident(r) not in known]
    facilities += added
    print(f"  {len(facilities) - len(added)} local rows + {len(added)} new upstream rows")

    # Coordinates this script derived on a previous run are recomputed from
    # scratch, so re-running can only improve them.
    for r in facilities:
        if r.pop("derived", False):
            r.pop("city_coords", None)
        r.pop("precision", None)

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

    # Upstream calls its coordinate field `city_coords` because that is what it
    # holds: a city centroid. Only our own curated rows — the ones carrying a
    # source URL that was checked by hand — are accurate to the building.
    def is_surveyed(r) -> bool:
        return bool(r.get("source_url"))

    cities_tsv = fetch_zip_member(
        GEONAMES + "dump/cities1000.zip", "cities1000.zip", "cities1000.txt")
    us_tsv = fetch_zip_member(GEONAMES + "zip/US.zip", "US.zip", "US.txt")
    admin1_tsv = fetch(
        GEONAMES + "dump/admin1CodesASCII.txt", "admin1.txt").decode("utf-8")
    country_tsv = fetch(
        GEONAMES + "dump/countryInfo.txt", "countryInfo.txt").decode("utf-8")

    print("Building gazetteers ...")
    iso = build_country_index(country_tsv)
    cities, admin1, admin1_names, countries = build_gazetteers(cities_tsv, admin1_tsv)
    zips = build_zip_index(us_tsv)
    print(f"  {len(cities)} city keys, {len(admin1)} admin1, "
          f"{len(countries)} countries, {len(zips)} US ZIPs")

    # Coordinates present in the pre-dedup collection but lost during dedup.
    by_name: dict[tuple[str, str], list] = {}
    for r in raw:
        c = as_coords(r.get("city_coords"))
        if c:
            by_name.setdefault((norm(r.get("name")), norm(r.get("country"))), c)

    # Cities the upstream set already knows about, keyed the same way we key
    # GeoNames — this catches spellings GeoNames lists under another name.
    upstream_cities: dict[tuple[str, str], list] = {}
    for r in facilities + raw:
        c = as_coords(r.get("city_coords"))
        if c and r.get("city"):
            upstream_cities.setdefault((norm(r.get("city")), norm(r.get("country"))), c)

    def zip5(z: str | None) -> str:
        return (z or "").strip().split("-")[0].zfill(5) if (z or "").strip() else ""

    stats: dict[str, int] = defaultdict(int)
    out = []

    for r in facilities:
        rec = dict(r)
        country = r.get("country") or ""
        iso2 = iso.get(norm(country), "")
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

        # 5. state / admin1 centroid
        if coords is None and r.get("state") and iso2:
            code = admin1_names.get((iso2, norm(r.get("state"))))
            if code and code in admin1:
                coords, precision = admin1[code], "state"

        # 6. country centroid — last resort
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
