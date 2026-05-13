"use client";

import { useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useActiveLayerId } from "@tour/lib/store";
import { RACK_FOCUS_BILLBOARD } from "@tour/lib/layerAnchors";
import { LayerHtml } from "./LayerHtml";

function sampleNVL(_elapsed: number) {
  const wig = (a: number, p: number) => Math.sin(_elapsed * 0.4 + p) * a;
  return {
    aggregateTBs: 1450 + wig(80, 0),
    perPortGBs: [180, 178, 184, 175, 181, 179, 176, 183].map(
      (b, i) => b + wig(8, i + 1),
    ),
    crcErrs: 0,
    bandwidthEff: 0.96 + wig(0.012, 9),
  };
}

export function NVLinkCountersLayer() {
  const visible = useActiveLayerId() === "nvlink-counters";
  if (!visible) return null;
  return <NVLPanel />;
}

function NVLPanel() {
  const [s, setS] = useState(() => sampleNVL(0));
  useFrame(({ clock }) => {
    const next = sampleNVL(clock.elapsedTime);
    setS((prev) =>
      Math.abs(next.aggregateTBs - prev.aggregateTBs) < 5 ? prev : next,
    );
  });
  return (
    <LayerHtml
      position={[
        RACK_FOCUS_BILLBOARD.x,
        RACK_FOCUS_BILLBOARD.y,
        RACK_FOCUS_BILLBOARD.z,
      ]}
      style={{ pointerEvents: "none", transform: "translate(-50%, -100%)" }}
    >
      <div className="nv-panel">
        <div className="nv-panel__head">
          <span className="nv-panel__chip">NVSwitch SDK · per-port</span>
          <span className="nv-panel__src">9 NVSwitch · 72 ports</span>
        </div>
        <div className="nv-totals">
          <div className="nv-tot">
            <span className="nv-tot__label">Aggregate</span>
            <span className="nv-tot__val">{(s.aggregateTBs / 1000).toFixed(2)} TB/s</span>
          </div>
          <div className="nv-tot">
            <span className="nv-tot__label">Eff.</span>
            <span className="nv-tot__val">{(s.bandwidthEff * 100).toFixed(1)}%</span>
          </div>
          <div className="nv-tot">
            <span className="nv-tot__label">CRC errs</span>
            <span className="nv-tot__val nv-tot__val--good">{s.crcErrs}</span>
          </div>
        </div>
        <div className="nv-grid">
          {s.perPortGBs.map((g, i) => (
            <div className="nv-port" key={i}>
              <div className="nv-port__name">p{i}</div>
              <div className="nv-port__track">
                <div
                  className="nv-port__fill"
                  style={{ width: `${Math.min(100, g / 200 * 100)}%` }}
                />
              </div>
              <div className="nv-port__val">{g.toFixed(0)} GB/s</div>
            </div>
          ))}
        </div>
        <p className="nv-foot">
          Counters live in the switch ASIC. Tied to power; faking them breaks
          the energy balance.
        </p>
      </div>
      <style jsx>{`
        .nv-panel {
          width: 396px;
          padding: 9px 11px;
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.92);
          background: rgba(8, 12, 18, 0.85);
          border: 1px solid rgba(168, 85, 247, 0.4);
          border-radius: 12px;
          backdrop-filter: blur(12px) saturate(140%);
          -webkit-backdrop-filter: blur(12px) saturate(140%);
          box-shadow: 0 10px 32px rgba(0, 0, 0, 0.55);
          user-select: none;
        }
        .nv-panel__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .nv-panel__chip {
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #d8b4fe;
        }
        .nv-panel__src {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.55);
        }
        .nv-totals {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 6px;
        }
        .nv-tot {
          display: flex;
          flex-direction: column;
        }
        .nv-tot__label {
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
        }
        .nv-tot__val {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 12.5px;
          font-weight: 600;
          color: #d8b4fe;
        }
        .nv-tot__val--good {
          color: #4ade80;
        }
        .nv-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 4px 14px;
        }
        .nv-port {
          display: grid;
          grid-template-columns: 24px 1fr 60px;
          gap: 6px;
          align-items: center;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 9.5px;
        }
        .nv-port__name {
          color: rgba(255, 255, 255, 0.5);
        }
        .nv-port__track {
          height: 4px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          overflow: hidden;
        }
        .nv-port__fill {
          height: 100%;
          background: linear-gradient(90deg, #c4b5fd, #a855f7);
          border-radius: 999px;
          transition: width 0.2s linear;
        }
        .nv-port__val {
          color: rgba(255, 255, 255, 0.85);
          text-align: right;
        }
        .nv-foot {
          margin: 6px 0 0;
          padding-top: 6px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.5);
          line-height: 1.4;
        }
      `}</style>
    </LayerHtml>
  );
}
