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
  // Richer fields (present on DataNorge-sourced entries)
  mw_current?: number | null;
  mw_planned_max?: number | null;
  owner_ultimate?: string | null;
  status?: string | null;
  confidence?: number | null;
  source_url?: string | null;
}

export interface CountryStat {
  country: string;
  count: number;
  topCompanies: { company: string; count: number }[];
}
