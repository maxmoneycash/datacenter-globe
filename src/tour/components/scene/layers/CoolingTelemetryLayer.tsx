"use client";

import { useState } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useActiveLayerId } from "@tour/lib/store";
import { LayerHtml } from "./LayerHtml";

/**
 * Anchors:
 * - CDU sits at world (22, ~2.6, 6).
 * - Supply/return badges sit on the manifold run near CDU where the cooling
 *   tour shot can see them clearly.
 * - Rack-side manifold summary is floated near CDU so it stays in frame for the
 *   cooling telemetry tour stop while still showing rack-loop numbers.
 */
const CDU_WORLD = { x: 22, y: 2.6, z: 6 } as const;
/** Manifold billboard: near CDU, above pipe run, readable on the telemetry shot. */
const RACK_LOOP_HUD_WORLD = { x: 17.75, y: CDU_WORLD.y + 2.05, z: CDU_WORLD.z + 1.2 } as const;

type CoolingVitals = {
  flow: number; // L/min
  supplyT: number; // °C
  returnT: number; // °C
  pressure: number; // bar
  rackKw: number; // computed Q_rejected
};

function sampleCoolingVitals(t: number): CoolingVitals {
  // Steady-state with small process noise.
  const flow = 244 + Math.sin(t * 0.3) * 6 + Math.sin(t * 1.4) * 1.5;
  const supplyT = 28 + Math.sin(t * 0.18) * 0.4;
  const returnT = supplyT + 9.4 + Math.sin(t * 0.22 + 1.1) * 0.35;
  const pressure = 3.18 + Math.sin(t * 0.31 + 0.6) * 0.04;
  // Q (kW) = flow (L/min) / 60 * 4.18 (kJ/kg·K) * dT
  const rackKw = (flow / 60) * 4.18 * (returnT - supplyT);
  return { flow, supplyT, returnT, pressure, rackKw };
}

export function CoolingTelemetryLayer() {
  const visible = useActiveLayerId() === "cooling-telemetry";
  if (!visible) return null;
  return (
    <group>
      <CduPanel />
      <RackManifoldPanel />
      <PipeBadge label="supply" tColor="#22d3ee" position={[16.75, 1.72, 5.95]} />
      <PipeBadge label="return" tColor="#fb923c" position={[19.5, 1.05, 5.92]} />
    </group>
  );
}

function useCoolingVitals(): CoolingVitals {
  const [v, setV] = useState<CoolingVitals>(() => sampleCoolingVitals(0));
  useFrame(({ clock }) => {
    const next = sampleCoolingVitals(clock.elapsedTime);
    setV((prev) => {
      if (
        Math.abs(next.flow - prev.flow) < 0.6 &&
        Math.abs(next.returnT - prev.returnT) < 0.1
      ) {
        return prev;
      }
      return next;
    });
  });
  return v;
}

function CduPanel() {
  const v = useCoolingVitals();
  return (
    <LayerHtml
      position={[CDU_WORLD.x, CDU_WORLD.y + 1.2, CDU_WORLD.z]}
      style={{ pointerEvents: "none", transform: "translate(-50%, -100%)" }}
    >
      <div className="ct-panel">
        <div className="ct-panel__head">
          <span className="ct-panel__chip">CDU · primary loop</span>
          <span className="ct-panel__src">BMS · 1 s</span>
        </div>
        <div className="ct-grid">
          <Stat label="Flow" value={`${v.flow.toFixed(0)} L/min`} accent="#22d3ee" />
          <Stat label="Supply" value={`${v.supplyT.toFixed(1)} °C`} accent="#22d3ee" />
          <Stat label="Return" value={`${v.returnT.toFixed(1)} °C`} accent="#fb923c" />
          <Stat label="ΔT" value={`${(v.returnT - v.supplyT).toFixed(1)} °C`} accent="#facc15" />
          <Stat label="Press" value={`${v.pressure.toFixed(2)} bar`} accent="#94a3b8" />
          <Stat label="Q rej." value={`${v.rackKw.toFixed(0)} kW`} accent="#22d3ee" />
        </div>
        <p className="ct-foot">
          Q ≈ ṁ · cₚ · ΔT — must match rack electrical input within a few %.
        </p>
      </div>
      <style jsx>{`
        .ct-panel {
          width: 252px;
          padding: 10px 12px;
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.92);
          background: rgba(8, 12, 18, 0.82);
          border: 1px solid rgba(34, 211, 238, 0.35);
          border-radius: 12px;
          backdrop-filter: blur(10px) saturate(140%);
          -webkit-backdrop-filter: blur(10px) saturate(140%);
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
          user-select: none;
        }
        .ct-panel__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .ct-panel__chip {
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #67e8f9;
        }
        .ct-panel__src {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.5);
        }
        .ct-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px 8px;
          margin-bottom: 6px;
        }
        .ct-foot {
          margin: 0;
          padding-top: 6px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.55);
          line-height: 1.3;
        }
      `}</style>
    </LayerHtml>
  );
}

function RackManifoldPanel() {
  const v = useCoolingVitals();
  return (
    <LayerHtml
      dockStackOffset={200}
      position={[
        RACK_LOOP_HUD_WORLD.x,
        RACK_LOOP_HUD_WORLD.y,
        RACK_LOOP_HUD_WORLD.z,
      ]}
      style={{
        pointerEvents: "none",
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="ct-rack">
        <div className="ct-rack__head">rack manifold</div>
        <div className="ct-rack__row">
          <span>flow</span>
          <span>{v.flow.toFixed(0)} L/min</span>
        </div>
        <div className="ct-rack__row">
          <span>ΔT</span>
          <span>{(v.returnT - v.supplyT).toFixed(1)} °C</span>
        </div>
        <div className="ct-rack__row ct-rack__row--accent">
          <span>Q out</span>
          <span>{v.rackKw.toFixed(0)} kW</span>
        </div>
      </div>
      <style jsx>{`
        .ct-rack {
          width: 144px;
          padding: 6px 9px;
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          font-size: 10.5px;
          color: rgba(255, 255, 255, 0.9);
          background: rgba(8, 12, 18, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
        }
        .ct-rack__head {
          font-size: 9.5px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #67e8f9;
          margin-bottom: 4px;
        }
        .ct-rack__row {
          display: flex;
          justify-content: space-between;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 10.5px;
          color: rgba(255, 255, 255, 0.85);
          padding: 1px 0;
        }
        .ct-rack__row--accent {
          color: #facc15;
          border-top: 1px dashed rgba(255, 255, 255, 0.15);
          margin-top: 2px;
          padding-top: 3px;
        }
      `}</style>
    </LayerHtml>
  );
}

function PipeBadge({
  label,
  tColor,
  position,
}: {
  label: string;
  tColor: string;
  position: [number, number, number];
}) {
  return (
    <Html
      position={position}
      style={{ pointerEvents: "none", transform: "translate(-50%, -50%)" }}
    >
      <div className="ct-pipe" style={{ ["--accent" as never]: tColor }}>
        <span className="ct-pipe__dot" />
        {label}
      </div>
      <style jsx>{`
        .ct-pipe {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          font-size: 9.5px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--accent);
          background: rgba(8, 12, 18, 0.7);
          padding: 2px 7px;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--accent) 50%, transparent);
          white-space: nowrap;
        }
        .ct-pipe__dot {
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: var(--accent);
          box-shadow: 0 0 6px var(--accent);
        }
      `}</style>
    </Html>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="ct-stat">
      <span className="ct-stat__label">{label}</span>
      <span className="ct-stat__value" style={{ color: accent }}>
        {value}
      </span>
      <style jsx>{`
        .ct-stat {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .ct-stat__label {
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
        }
        .ct-stat__value {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 12.5px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

