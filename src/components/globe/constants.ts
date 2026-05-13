export const EARTH_RADIUS = 100;

// Density bucket colors (same palette as original Gini visualization)
export const COLOR_EXTREME = '#ef4444'; // ≥ 200 datacenters
export const COLOR_HIGH = '#fb923c';    // 50 – 199
export const COLOR_MED = '#facc15';     // 10 – 49
export const COLOR_LOW = '#4ade80';     // 1 – 9
export const COLOR_UNKNOWN = '#4b5563'; // 0

export type DensityBucket = 'extreme' | 'high' | 'medium' | 'low' | 'none';

export function bucketFor(count: number): DensityBucket {
  if (count >= 200) return 'extreme';
  if (count >= 50) return 'high';
  if (count >= 10) return 'medium';
  if (count >= 1) return 'low';
  return 'none';
}

export const BUCKET_COLORS: Record<DensityBucket, string> = {
  extreme: COLOR_EXTREME,
  high: COLOR_HIGH,
  medium: COLOR_MED,
  low: COLOR_LOW,
  none: COLOR_UNKNOWN,
};

export const COUNTRY_ALIASES: Record<string, string> = {
  'United States of America': 'United States',
  'Russian Federation': 'Russia',
  'Republic of Korea': 'South Korea',
  'Korea, Republic of': 'South Korea',
  'Czechia': 'Czech Republic',
  'Republic of Serbia': 'Serbia',
  'United Republic of Tanzania': 'Tanzania',
  'Bolivia, Plurinational State of': 'Bolivia',
  'Iran, Islamic Republic of': 'Iran',
  'Venezuela, Bolivarian Republic of': 'Venezuela',
  'Viet Nam': 'Vietnam',
  'Syrian Arab Republic': 'Syria',
  "Lao People's Democratic Republic": 'Laos',
  'Republic of Moldova': 'Moldova',
};

export function normalizeCountry(name: string): string {
  return COUNTRY_ALIASES[name] || name;
}
