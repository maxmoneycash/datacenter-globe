"use client";

import { useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useActiveLayerId } from "@tour/lib/store";
import { RACK_FOCUS_BILLBOARD } from "@tour/lib/layerAnchors";
import { LayerHtml } from "./LayerHtml";

const LOSS_HISTORY_N = 60;

function lossAt(t: number, idx: number): number {
  // A noisy decaying loss that looks like a real training run.
  const x = (idx + t * 0.05) / LOSS_HISTORY_N;
  return 4.2 * Math.exp(-x * 0.9) + 1.3 + Math.sin(x * 14) * 0.08 + (Math.random() - 0.5) * 0.04;
}

export function MLTrainingLayer() {
  const visible = useActiveLayerId() === "ml-training";
  if (!visible) return null;
  return <TrainingPanel />;
}

function TrainingPanel() {
  // Pre-fill a deterministic-ish loss series, then advance one step per
  // ~250ms so the chart trails realistically.
  const initial = useMemo(
    () => Array.from({ length: LOSS_HISTORY_N }, (_, i) => lossAt(0, i)),
    [],
  );
  const [series, setSeries] = useState<number[]>(initial);
  const [step, setStep] = useState(12_847);
  const [tps, setTps] = useState(312_400);
  const [evalScore, setEvalScore] = useState(0.412);
  const [lastTick, setLastTick] = useState(0);

  useFrame(({ clock }) => {
    const t = Math.floor(clock.elapsedTime / 0.25);
    if (t === lastTick) return;
    setLastTick(t);
    setSeries((prev) => {
      const next = prev.slice(1);
      next.push(lossAt(clock.elapsedTime, LOSS_HISTORY_N - 1));
      return next;
    });
    setStep((s) => s + 1);
    setTps(310_000 + Math.floor(Math.sin(clock.elapsedTime * 0.4) * 4500));
    setEvalScore((e) => Math.min(0.93, e + 0.0001));
  });

  const lossNow = series[series.length - 1];
  const minLoss = Math.min(...series);
  const maxLoss = Math.max(...series);

  return (
    <LayerHtml
      position={[
        RACK_FOCUS_BILLBOARD.x,
        RACK_FOCUS_BILLBOARD.y,
        RACK_FOCUS_BILLBOARD.z,
      ]}
      style={{ pointerEvents: "none", transform: "translate(-50%, -100%)" }}
    >
      <div className="ml-panel">
        <div className="ml-panel__head">
          <span className="ml-panel__chip">W&amp;B · run f7c-blackwell-3</span>
          <span className="ml-panel__src">step {step.toLocaleString()}</span>
        </div>
        <div className="ml-grid">
          <div>
            <span className="ml-grid__label">loss</span>
            <span className="ml-grid__val">{lossNow.toFixed(3)}</span>
          </div>
          <div>
            <span className="ml-grid__label">tokens/s</span>
            <span className="ml-grid__val">{(tps / 1000).toFixed(1)} k</span>
          </div>
          <div>
            <span className="ml-grid__label">eval (mmlu)</span>
            <span className="ml-grid__val">{(evalScore * 100).toFixed(1)}%</span>
          </div>
          <div>
            <span className="ml-grid__label">ckpt</span>
            <span className="ml-grid__val ml-grid__val--mono">7e3a…b29c</span>
          </div>
        </div>
        <Spark series={series} min={minLoss} max={maxLoss} />
        <p className="ml-foot">
          Loss curve has a recognizable shape per architecture. With code +
          dataset hashes, third parties can replay a slice and check.
        </p>
      </div>
      <style jsx>{`
        .ml-panel {
          width: 396px;
          padding: 9px 11px;
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.92);
          background: rgba(8, 12, 18, 0.85);
          border: 1px solid rgba(255, 77, 79, 0.32);
          border-radius: 12px;
          backdrop-filter: blur(12px) saturate(140%);
          -webkit-backdrop-filter: blur(12px) saturate(140%);
          box-shadow: 0 10px 32px rgba(0, 0, 0, 0.55);
          user-select: none;
        }
        .ml-panel__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .ml-panel__chip {
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #fca5a5;
        }
        .ml-panel__src {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.55);
        }
        .ml-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 6px;
        }
        .ml-grid > div {
          display: flex;
          flex-direction: column;
        }
        .ml-grid__label {
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
        }
        .ml-grid__val {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 13px;
          font-weight: 600;
          color: #fca5a5;
        }
        .ml-grid__val--mono {
          font-size: 10.5px;
          color: rgba(255, 255, 255, 0.85);
        }
        .ml-foot {
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

function Spark({
  series,
  min,
  max,
}: {
  series: number[];
  min: number;
  max: number;
}) {
  const w = 372;
  const h = 56;
  const span = Math.max(0.1, max - min);
  const path = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `${path} L${w} ${h} L0 ${h} Z`;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="ml-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#fca5a5" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#fca5a5" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#ml-grad)" />
      <path d={path} fill="none" stroke="#fca5a5" strokeWidth={1.4} />
    </svg>
  );
}
