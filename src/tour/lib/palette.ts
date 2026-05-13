export const palette = {
  compute: "#ff4d4f",
  cooling: "#22d3ee",
  power: "#f59e0b",
  nvlink: "#a855f7",
  fabric: "#10b981",
  storage: "#3b82f6",
  shell: "#9ca3af",
  shellDark: "#374151",
  ground: "#0a0d12",
  floor: "#15191f",
  accent: "#f5f5f4",
  hot: "#fb923c",
  verify: "#facc15",
} as const;

export type PaletteKey = keyof typeof palette;

export const moduleColorKeys: Record<string, PaletteKey> = {
  site: "shell",
  power: "power",
  cooling: "cooling",
  hall: "compute",
  rack: "compute",
  node: "nvlink",
  network: "fabric",
  storage: "storage",
};
