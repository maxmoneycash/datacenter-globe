import type { Precision } from './precision';

export interface Datacenter {
  name: string;
  company: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country: string;
  address?: string;
  city_coords?: [number, number]; // [lat, lng]
  // How the coordinate above was arrived at — see precision.ts
  precision?: Precision;
  // True when the coordinate was resolved by our geocoder rather than
  // supplied by a source. Regenerated from scratch on every enrichment run.
  derived?: boolean;
  // Richer fields (present on DataNorge-sourced entries)
  mw_current?: number | null;
  mw_planned_max?: number | null;
  owner_ultimate?: string | null;
  status?: string | null;
  confidence?: number | null;
  source_url?: string | null;
  // Derived at load time from the company name — see hyperscalers.ts
  hyperscaler?:
    | 'AWS'
    | 'Microsoft'
    | 'Google'
    | 'Meta'
    | 'Apple'
    | 'Oracle'
    | 'IBM'
    | 'Alibaba'
    | 'Tencent'
    | 'ByteDance'
    | null;
}

export interface CountryStat {
  country: string;
  count: number;
  topCompanies: { company: string; count: number }[];
}
