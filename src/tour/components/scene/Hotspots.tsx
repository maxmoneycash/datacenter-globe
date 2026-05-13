"use client";

import { Html } from "@react-three/drei";
import { palette } from "@tour/lib/palette";
import { useAppStore } from "@tour/lib/store";
import { MODULES } from "@tour/lib/modules";
import { getStopMeta } from "@tour/lib/stops";
import type { ModuleId } from "@tour/lib/types";

const HOTSPOT_POS: Record<ModuleId, [number, number, number]> = {
  site: [-13, 4.5, 11],
  power: [-22, 5.6, 8],
  cooling: [22, 5.6, 6],
  hall: [-7, 4.6, -8],
  rack: [0, 4.0, -2],
  node: [1.6, 3.55, -1.0],
  network: [0, 7.4, -10],
  storage: [14, 2.6, -8],
};

export function Hotspots() {
  const mode = useAppStore((s) => s.mode);
  const locale = useAppStore((s) => s.locale);
  const focusedId = useAppStore((s) => s.focusedModuleId);
  const openDetail = useAppStore((s) => s.openDetail);
  const focusModule = useAppStore((s) => s.focusModule);

  if (mode !== "free") return null;

  return (
    <>
      {MODULES.map((m) => {
        const pos = HOTSPOT_POS[m.id];
        const isActive = focusedId === m.id;
        const label = getStopMeta(m.id, locale).label;
        if (isActive) return null;
        const color = `var(--color-${
          m.colorKey === "compute"
            ? "compute"
            : m.colorKey === "cooling"
              ? "cooling"
              : m.colorKey === "power"
                ? "power"
                : m.colorKey === "nvlink"
                  ? "nvlink"
                  : m.colorKey === "fabric"
                    ? "fabric"
                    : m.colorKey === "storage"
                      ? "storage"
                      : "shell"
        })`;
        return (
          <Html
            key={m.id}
            position={pos}
            center
            zIndexRange={[20, 0]}
            occlude={false}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                focusModule(m.id);
                openDetail(m.id);
                const moduleMeta = getStopMeta(m.id, locale);
                if (moduleMeta.kind === "module" && moduleMeta.anim)
                  useAppStore.getState().triggerAnim(moduleMeta.anim);
              }}
              className={`group flex items-center gap-2 select-none whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase transition-all ${
                isActive
                  ? "border-white/80 bg-black/80 text-white scale-105"
                  : "border-white/20 bg-black/55 text-white/85 hover:bg-black/75"
              }`}
              style={{
                boxShadow: isActive
                  ? `0 0 0 2px ${color}, 0 4px 18px rgba(0,0,0,0.45)`
                  : `0 2px 12px rgba(0,0,0,0.4)`,
              }}
            >
              <span
                className="block h-2 w-2 rounded-full pulse-soft"
                style={{ background: color, boxShadow: `0 0 10px ${color}` }}
              />
              {label}
            </button>
          </Html>
        );
      })}
    </>
  );
}

void palette;
