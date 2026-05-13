"use client";

import { useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useActiveLayerId } from "@tour/lib/store";
import { FEATURED_RACK_BASE } from "@tour/lib/layerAnchors";
import { LayerHtml } from "./LayerHtml";

function sample(t: number) {
  const wig = (a: number, p: number) => Math.sin(t * 0.4 + p) * a;
  const phaseA = 168 + wig(2.4, 0);
  const phaseB = 165 + wig(2.0, 1);
  const phaseC = 170 + wig(2.2, 2);
  const voltage = 415;
  const kw =
    (phaseA + phaseB + phaseC) * voltage * 0.001 * Math.sqrt(3) * 0.95 / 1000 *
    1000;
  return {
    phaseA,
    phaseB,
    phaseC,
    voltage,
    kw,
    kwhToday: 2780 + wig(15, 7),
    facilityMw: 117.4 + wig(1.4, 9),
    utilityMatch: true,
  };
}

export function RackPowerLayer() {
  const visible = useActiveLayerId() === "rack-power";
  if (!visible) return null;
  return (
    <group>
      <RackPDUPanel />
      <FacilityMeterPanel />
    </group>
  );
}

function RackPDUPanel() {
  const [s, setS] = useState(() => sample(0));
  useFrame(({ clock }) => {
    const next = sample(clock.elapsedTime);
    setS((prev) => (Math.abs(next.kw - prev.kw) < 0.5 ? prev : next));
  });
  return (
    <LayerHtml
      position={[
        FEATURED_RACK_BASE.x + 0.55,
        FEATURED_RACK_BASE.y + 3.15,
        FEATURED_RACK_BASE.z,
      ]}
      style={{ pointerEvents: "none", transform: "translate(-100%, -100%)" }}
    >
      <div className="rp-panel">
        <div className="rp-panel__head">
          <span className="rp-panel__chip">PDU · A07</span>
          <span className="rp-panel__src">smart PDU · 1 s</span>
        </div>
        <div className="rp-grid">
          <div className="rp-cell">
            <span className="rp-cell__label">L1</span>
            <span className="rp-cell__val">{s.phaseA.toFixed(0)} A</span>
          </div>
          <div className="rp-cell">
            <span className="rp-cell__label">L2</span>
            <span className="rp-cell__val">{s.phaseB.toFixed(0)} A</span>
          </div>
          <div className="rp-cell">
            <span className="rp-cell__label">L3</span>
            <span className="rp-cell__val">{s.phaseC.toFixed(0)} A</span>
          </div>
          <div className="rp-cell">
            <span className="rp-cell__label">V</span>
            <span className="rp-cell__val">{s.voltage} V</span>
          </div>
          <div className="rp-cell rp-cell--big">
            <span className="rp-cell__label">Rack draw</span>
            <span className="rp-cell__val rp-cell__val--accent">
              {(s.kw / 1000).toFixed(1)} kW
            </span>
          </div>
          <div className="rp-cell">
            <span className="rp-cell__label">kWh today</span>
            <span className="rp-cell__val">{s.kwhToday.toFixed(0)}</span>
          </div>
        </div>
      </div>
      <style jsx>{`
        .rp-panel {
          width: 232px;
          padding: 9px 11px;
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.92);
          background: rgba(8, 12, 18, 0.85);
          border: 1px solid rgba(245, 158, 11, 0.35);
          border-radius: 12px;
          backdrop-filter: blur(12px) saturate(140%);
          -webkit-backdrop-filter: blur(12px) saturate(140%);
          box-shadow: 0 10px 32px rgba(0, 0, 0, 0.55);
          user-select: none;
        }
        .rp-panel__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .rp-panel__chip {
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #fbbf24;
        }
        .rp-panel__src {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.55);
        }
        .rp-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px 8px;
        }
        .rp-cell {
          display: flex;
          flex-direction: column;
        }
        .rp-cell--big {
          grid-column: span 2;
        }
        .rp-cell__label {
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
        }
        .rp-cell__val {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.92);
        }
        .rp-cell__val--accent {
          color: #fbbf24;
        }
      `}</style>
    </LayerHtml>
  );
}

function FacilityMeterPanel() {
  const [s, setS] = useState(() => sample(0));
  useFrame(({ clock }) => {
    const next = sample(clock.elapsedTime);
    setS((prev) =>
      Math.abs(next.facilityMw - prev.facilityMw) < 0.05 ? prev : next,
    );
  });
  return (
    <LayerHtml
      dockStackOffset={200}
      position={[-5.8, 6.2, 0.8]}
      style={{ pointerEvents: "none", transform: "translate(-50%, -100%)" }}
    >
      <div className="rp-fac">
        <div className="rp-fac__head">
          <span className="rp-fac__chip">Utility revenue meter</span>
          <span className="rp-fac__src">grid op · sealed</span>
        </div>
        <div className="rp-fac__big">
          {s.facilityMw.toFixed(1)} <span className="rp-fac__unit">MW</span>
        </div>
        <div className="rp-fac__rows">
          <div>
            <span>vs operator BMS</span>
            <span className="rp-fac__ok">✓ matches within 0.4%</span>
          </div>
          <div>
            <span>vs FERC filing</span>
            <span className="rp-fac__ok">✓ within permitted 118 MW</span>
          </div>
        </div>
      </div>
      <style jsx>{`
        .rp-fac {
          width: 256px;
          padding: 9px 11px;
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.92);
          background: rgba(8, 12, 18, 0.85);
          border: 1px solid rgba(250, 204, 21, 0.4);
          border-radius: 12px;
          backdrop-filter: blur(12px) saturate(140%);
          -webkit-backdrop-filter: blur(12px) saturate(140%);
          box-shadow: 0 10px 32px rgba(0, 0, 0, 0.55);
          user-select: none;
        }
        .rp-fac__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        .rp-fac__chip {
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #facc15;
        }
        .rp-fac__src {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.55);
        }
        .rp-fac__big {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 28px;
          font-weight: 700;
          color: #facc15;
          letter-spacing: 0.02em;
          line-height: 1;
          margin-bottom: 6px;
        }
        .rp-fac__unit {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.55);
          font-weight: 500;
        }
        .rp-fac__rows > div {
          display: flex;
          justify-content: space-between;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 10px;
          padding: 1px 0;
        }
        .rp-fac__rows > div > span:first-child {
          color: rgba(255, 255, 255, 0.55);
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
        }
        .rp-fac__ok {
          color: #4ade80;
        }
      `}</style>
    </LayerHtml>
  );
}
