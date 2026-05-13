"use client";

import { useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useActiveLayerId } from "@tour/lib/store";
import { LayerHtml } from "./LayerHtml";

const FABRIC_WORLD = { x: 0, y: 6, z: -10 } as const;

function sample(t: number) {
  const wig = (a: number, p: number) => Math.sin(t * 0.4 + p) * a;
  return {
    eastWestTbs: 38 + wig(2.5, 0),
    spineGbs: [612, 605, 619, 608].map((g, i) => g + wig(20, i + 1)),
    leafLinks: 4096,
    droppedFrames: 0,
    pause: 0.08 + wig(0.02, 8),
    topPair: "rack A07 ↔ A12",
  };
}

export function FabricCountersLayer() {
  const visible = useActiveLayerId() === "fabric-counters";
  if (!visible) return null;
  return <FabPanel />;
}

function FabPanel() {
  const [s, setS] = useState(() => sample(0));
  useFrame(({ clock }) => {
    const next = sample(clock.elapsedTime);
    setS((prev) =>
      Math.abs(next.eastWestTbs - prev.eastWestTbs) < 0.3 ? prev : next,
    );
  });
  return (
    <LayerHtml
      position={[FABRIC_WORLD.x + 6, FABRIC_WORLD.y + 4, FABRIC_WORLD.z + 4]}
      style={{ transform: "translate(-50%, -100%)" }}
    >
      <div className="fb-panel">
        <div className="fb-panel__head">
          <span className="fb-panel__chip">UFM · fabric monitor</span>
          <span className="fb-panel__src">spine 32 · leaf 1024</span>
        </div>
        <div className="fb-totals">
          <div>
            <span className="fb-totals__label">East-West</span>
            <span className="fb-totals__val">{s.eastWestTbs.toFixed(1)} TB/s</span>
          </div>
          <div>
            <span className="fb-totals__label">Leaf links</span>
            <span className="fb-totals__val">{s.leafLinks.toLocaleString()}</span>
          </div>
          <div>
            <span className="fb-totals__label">Drops/min</span>
            <span className="fb-totals__val fb-totals__val--good">{s.droppedFrames}</span>
          </div>
          <div>
            <span className="fb-totals__label">PFC pause</span>
            <span className="fb-totals__val">{(s.pause * 100).toFixed(2)}%</span>
          </div>
        </div>
        <div className="fb-spines">
          <span className="fb-spines__head">Top spine link util</span>
          {s.spineGbs.map((g, i) => (
            <div className="fb-spine" key={i}>
              <span className="fb-spine__name">spine-{i + 1}</span>
              <div className="fb-spine__track">
                <div
                  className="fb-spine__fill"
                  style={{ width: `${Math.min(100, (g / 800) * 100)}%` }}
                />
              </div>
              <span className="fb-spine__val">{g.toFixed(0)} Gb/s</span>
            </div>
          ))}
        </div>
        <p className="fb-foot">
          Top talker: {s.topPair}. Collective patterns are visible even with
          payload encrypted.
        </p>
      </div>
      <style jsx>{`
        .fb-panel {
          width: 408px;
          padding: 9px 11px;
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.92);
          background: rgba(8, 12, 18, 0.85);
          border: 1px solid rgba(16, 185, 129, 0.4);
          border-radius: 12px;
          backdrop-filter: blur(12px) saturate(140%);
          -webkit-backdrop-filter: blur(12px) saturate(140%);
          box-shadow: 0 10px 32px rgba(0, 0, 0, 0.55);
          user-select: none;
        }
        .fb-panel__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .fb-panel__chip {
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #6ee7b7;
        }
        .fb-panel__src {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.55);
        }
        .fb-totals {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 6px;
        }
        .fb-totals > div {
          display: flex;
          flex-direction: column;
        }
        .fb-totals__label {
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
        }
        .fb-totals__val {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 12.5px;
          font-weight: 600;
          color: #6ee7b7;
        }
        .fb-totals__val--good {
          color: #4ade80;
        }
        .fb-spines {
          padding-top: 6px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .fb-spines__head {
          display: block;
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
          margin-bottom: 3px;
        }
        .fb-spine {
          display: grid;
          grid-template-columns: 56px 1fr 64px;
          gap: 6px;
          align-items: center;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 10px;
          padding: 1px 0;
        }
        .fb-spine__name {
          color: rgba(255, 255, 255, 0.55);
        }
        .fb-spine__track {
          height: 4px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          overflow: hidden;
        }
        .fb-spine__fill {
          height: 100%;
          background: linear-gradient(90deg, #6ee7b7, #10b981);
          border-radius: 999px;
          transition: width 0.2s linear;
        }
        .fb-spine__val {
          color: rgba(255, 255, 255, 0.85);
          text-align: right;
        }
        .fb-foot {
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
