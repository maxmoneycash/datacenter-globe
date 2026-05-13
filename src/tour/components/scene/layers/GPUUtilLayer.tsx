"use client";

import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { LayerHtml } from "./LayerHtml";
import type { Mesh, MeshStandardMaterial } from "three";
import { useActiveLayerId } from "@tour/lib/store";
import { COMPUTE_TRAY_ORIGIN } from "@tour/lib/layerAnchors";
import { palette } from "@tour/lib/palette";
import { COMPUTE_NODE_GPU_OFFSETS } from "../modules/ComputeNode";

const GPU_LABELS = ["GPU 0", "GPU 1", "GPU 2", "GPU 3"];

type GpuVitals = {
  util: number;
  power: number;
  mem: number;
  temp: number;
};

function sampleVitals(t: number, idx: number): GpuVitals {
  const phase = idx * 1.7;
  const utilRaw =
    92 +
    Math.sin(t * 0.7 + phase) * 4 +
    Math.sin(t * 2.3 + phase * 0.4) * 1.5;
  const util = Math.max(0, Math.min(100, utilRaw));
  const power = Math.max(
    0,
    700 +
      (util - 88) * 6 +
      Math.sin(t * 0.5 + phase * 0.7) * 18 +
      idx * 4,
  );
  const mem = 138 + Math.sin(t * 0.13 + phase) * 1.2 + idx * 0.4;
  const temp = 64 + (util - 85) * 0.18 + Math.sin(t * 0.21 + phase) * 0.9;
  return { util, power, mem, temp };
}

export function GPUUtilLayer() {
  const visible = useActiveLayerId() === "gpu-util";
  if (!visible) return null;

  return (
    <group>
      {COMPUTE_NODE_GPU_OFFSETS.map(([dx, dz], i) => (
        <GpuHotIndicator
          key={i}
          index={i}
          position={[
            COMPUTE_TRAY_ORIGIN.x + dx,
            COMPUTE_TRAY_ORIGIN.y,
            COMPUTE_TRAY_ORIGIN.z + dz,
          ]}
        />
      ))}
      <CombinedHud />
    </group>
  );
}

/**
 * A subtle pulsing halo on top of each GPU. Brightens with that GPU's
 * utilization so the static numbers and the 3D scene reinforce each other.
 */
function GpuHotIndicator({
  index,
  position,
}: {
  index: number;
  position: [number, number, number];
}) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const v = sampleVitals(clock.elapsedTime, index);
    if (!ref.current) return;
    const mat = ref.current.material as MeshStandardMaterial;
    mat.emissiveIntensity = 0.3 + (v.util / 100) * 0.9;
    const s = 1 + (v.util / 100) * 0.18;
    ref.current.scale.set(s, s, s);
  });
  return (
    <mesh
      ref={ref}
      position={[position[0], position[1] + 0.05, position[2]]}
      rotation-x={-Math.PI / 2}
    >
      <ringGeometry args={[0.07, 0.1, 32]} />
      <meshStandardMaterial
        color={palette.compute}
        emissive={palette.compute}
        emissiveIntensity={0.6}
        toneMapped={false}
        transparent
        opacity={0.85}
      />
    </mesh>
  );
}

/**
 * One combined panel with rows for all 4 GPUs of the featured tray. Anchored
 * just above and to the left of the tray, so on the rack-focus camera angle
 * it sits clearly to the camera's right (since the camera looks from +X).
 */
function CombinedHud() {
  const [vitals, setVitals] = useState<GpuVitals[]>(() =>
    [0, 1, 2, 3].map((i) => sampleVitals(0, i)),
  );

  useFrame(({ clock }) => {
    const next = [0, 1, 2, 3].map((i) => sampleVitals(clock.elapsedTime, i));
    setVitals((prev) => {
      const enough = next.every((n, i) => {
        const p = prev[i];
        return (
          Math.abs(n.util - p.util) < 0.4 &&
          Math.abs(n.power - p.power) < 6 &&
          Math.abs(n.temp - p.temp) < 0.3
        );
      });
      return enough ? prev : next;
    });
  });

  return (
    <LayerHtml
      position={[
        COMPUTE_TRAY_ORIGIN.x + 0.55,
        COMPUTE_TRAY_ORIGIN.y + 0.55,
        COMPUTE_TRAY_ORIGIN.z,
      ]}
      style={{
        pointerEvents: "none",
        // Anchor by the panel's bottom-right edge so it sits to the left of
        // the right side of the tray, extending leftward and up over the rack.
        transform: "translate(-100%, -100%)",
      }}
      zIndexRange={[80, 60]}
    >
      <div className="gu-panel">
        <div className="gu-panel__head">
          <div className="gu-panel__title">
            <span className="gu-panel__dot" /> gpu-util · DCGM
          </div>
          <span className="gu-panel__src">192 GB · B200 · tray 18</span>
        </div>
        {vitals.map((v, i) => (
          <div className="gu-row" key={i}>
            <div className="gu-row__name">{GPU_LABELS[i]}</div>
            <HudBar
              label="util"
              value={`${v.util.toFixed(0)}%`}
              fill={v.util / 100}
              tone="hot"
            />
            <HudBar
              label="pwr"
              value={`${v.power.toFixed(0)} W`}
              fill={v.power / 1200}
              tone="amber"
            />
            <HudBar
              label="mem"
              value={`${v.mem.toFixed(0)} / 192 GB`}
              fill={v.mem / 192}
              tone="violet"
            />
            <span className="gu-row__temp">{v.temp.toFixed(0)}°C</span>
          </div>
        ))}
        <div className="gu-panel__foot">
          DCGM · 1 Hz · scraped to Prometheus by node-exporter
        </div>
      </div>
      <style jsx>{`
        .gu-panel {
          width: 360px;
          padding: 10px 12px;
          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI",
            Roboto, sans-serif;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.92);
          background: rgba(8, 12, 18, 0.85);
          border: 1px solid rgba(255, 77, 79, 0.35);
          border-radius: 12px;
          backdrop-filter: blur(12px) saturate(140%);
          -webkit-backdrop-filter: blur(12px) saturate(140%);
          box-shadow: 0 10px 32px rgba(0, 0, 0, 0.55);
          user-select: none;
        }
        .gu-panel__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .gu-panel__title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #fca5a5;
        }
        .gu-panel__dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
          background: #ff4d4f;
          box-shadow: 0 0 8px #ff4d4f;
        }
        .gu-panel__src {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.5);
        }
        .gu-row {
          display: grid;
          grid-template-columns: 44px 1fr 1fr 1.4fr 36px;
          gap: 6px;
          align-items: center;
          padding: 3px 0;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .gu-row:first-of-type {
          border-top: none;
        }
        .gu-row__name {
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.04em;
        }
        .gu-row__temp {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 10.5px;
          color: rgba(255, 255, 255, 0.7);
          text-align: right;
        }
        .gu-panel__foot {
          margin-top: 5px;
          padding-top: 6px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.45);
        }
      `}</style>
    </LayerHtml>
  );
}

function HudBar({
  label,
  value,
  fill,
  tone,
}: {
  label: string;
  value: string;
  fill: number;
  tone: "hot" | "amber" | "violet";
}) {
  const colors: Record<typeof tone, string> = {
    hot: "linear-gradient(90deg, #f87171 0%, #fb923c 100%)",
    amber: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)",
    violet: "linear-gradient(90deg, #a78bfa 0%, #8b5cf6 100%)",
  };
  const clamped = Math.max(0, Math.min(1, fill));
  return (
    <div className="gu-bar">
      <div className="gu-bar__head">
        <span className="gu-bar__label">{label}</span>
        <span className="gu-bar__value">{value}</span>
      </div>
      <div className="gu-bar__track">
        <div
          className="gu-bar__fill"
          style={{
            width: `${clamped * 100}%`,
            background: colors[tone],
          }}
        />
      </div>
      <style jsx>{`
        .gu-bar {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .gu-bar__head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 4px;
        }
        .gu-bar__label {
          font-size: 9px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
        }
        .gu-bar__value {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.92);
          white-space: nowrap;
        }
        .gu-bar__track {
          height: 3px;
          background: rgba(255, 255, 255, 0.07);
          border-radius: 999px;
          overflow: hidden;
        }
        .gu-bar__fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.2s linear;
        }
      `}</style>
    </div>
  );
}
