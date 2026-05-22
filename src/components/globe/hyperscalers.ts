// Hyperscaler classification — map operator names to a normalized label
// + brand color. Used both for tagging pins on the globe and for filter UI.

export type Hyperscaler =
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

export const HYPERSCALER_COLORS: Record<Exclude<Hyperscaler, null>, string> = {
  AWS:        '#ff9900',  // Amazon orange
  Microsoft:  '#00a4ef',  // Azure blue
  Google:     '#4285f4',  // Google blue
  Meta:       '#0866ff',  // Meta blue
  Apple:      '#a2aaad',  // Apple silver
  Oracle:     '#f80000',  // Oracle red
  IBM:        '#1f70c1',  // IBM blue
  Alibaba:    '#ff6a00',  // Alibaba orange
  Tencent:    '#0052d9',  // Tencent blue
  ByteDance:  '#25f4ee',  // TikTok teal
};

export const HYPERSCALER_LIST: Exclude<Hyperscaler, null>[] = [
  'AWS', 'Microsoft', 'Google', 'Meta', 'Apple', 'Oracle', 'IBM',
  'Alibaba', 'Tencent', 'ByteDance',
];

// Patterns tried in order — first match wins. Be strict enough that
// "Amazonia Networks" doesn't get tagged as AWS.
const PATTERNS: { match: RegExp; label: Hyperscaler }[] = [
  { match: /\b(amazon\s+web\s+services|amazon\s+aws|amazon\.com|amazon\s+data\s+services|aws\b)/i, label: 'AWS' },
  { match: /\b(microsoft|azure)\b/i, label: 'Microsoft' },
  { match: /\b(google\s+cloud|google\s+llc|google\s+inc|google\s+ireland|google\s+data|google\.com|alphabet\b|^google\b)/i, label: 'Google' },
  { match: /\b(meta\s+platforms|facebook|instagram|meta\s+ireland|meta\s+spain|meta\s+sweden|meta\s+norway|meta\s+denmark)/i, label: 'Meta' },
  { match: /\b(apple\s+inc|apple\s+operations|^apple\b|apple\s+data|apple\s+sales)/i, label: 'Apple' },
  { match: /\b(oracle\b)/i, label: 'Oracle' },
  { match: /\bibm\b|international\s+business\s+machines/i, label: 'IBM' },
  { match: /\b(alibaba|aliyun|alicloud)\b/i, label: 'Alibaba' },
  { match: /\b(tencent)\b/i, label: 'Tencent' },
  { match: /\b(bytedance|tiktok)\b/i, label: 'ByteDance' },
];

export function classifyHyperscaler(company: string | null | undefined): Hyperscaler {
  if (!company) return null;
  for (const { match, label } of PATTERNS) {
    if (match.test(company)) return label;
  }
  return null;
}
