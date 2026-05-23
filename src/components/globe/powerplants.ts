// Color palette for primary fuel types — distinct hues for legibility.
export const FUEL_COLORS: Record<string, string> = {
  Solar:        '#fbbf24',  // amber
  Wind:         '#a3e635',  // lime
  Hydro:        '#22d3ee',  // cyan
  Nuclear:      '#34d399',  // emerald (clean, distinct from wind)
  Gas:          '#f97316',  // orange
  Coal:         '#9ca3af',  // grey
  Oil:          '#94a3b8',  // slate
  Biomass:      '#84cc16',  // lime green
  Waste:        '#a78bfa',  // violet
  Geothermal:   '#f43f5e',  // rose
  Storage:      '#60a5fa',  // blue
  Cogeneration: '#fb7185',  // pink
  Petcoke:      '#78716c',  // stone
  'Wave and Tidal': '#06b6d4',
  Other:        '#525252',
};

export const FUEL_ORDER: string[] = [
  'Solar', 'Wind', 'Hydro', 'Nuclear', 'Gas', 'Coal', 'Oil', 'Biomass', 'Waste',
  'Geothermal', 'Storage', 'Other',
];

export interface PowerPlant {
  n: string;     // name
  c: string;     // country code (ISO3)
  f: string;     // primary fuel
  m: number;     // capacity MW
  lat: number;
  lng: number;
  y: number | null; // commissioning year
}

export function plantColor(fuel: string): string {
  return FUEL_COLORS[fuel] || FUEL_COLORS.Other;
}
