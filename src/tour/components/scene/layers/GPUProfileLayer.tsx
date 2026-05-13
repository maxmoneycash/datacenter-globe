"use client";

import { useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useActiveLayerId } from "@tour/lib/store";
import { COMPUTE_TRAY_ORIGIN } from "@tour/lib/layerAnchors";
import { LayerHtml } from "./LayerHtml";

type Kernel = {
  name: string;
  category: "matmul" | "attention" | "comm" | "memcpy" | "other";
  pctTime: number;
  tcUtil?: number; // tensor-core utilization
  hbmGBs?: number;
  nvlinkGBs?: number;
};

function sampleKernels(t: number): Kernel[] {
  const wig = (a: number, p: number) => Math.sin(t * 0.3 + p) * a;
  return [
    {
      name: "ampere_fp16_matmul_NN_64x64",
      category: "matmul",
      pctTime: 38 + wig(2, 0),
      tcUtil: 89 + wig(2, 1),
      hbmGBs: 2700 + wig(60, 2),
    },
    {
      name: "flash_attn_fwd",
      category: "attention",
      pctTime: 17 + wig(1.4, 3),
      tcUtil: 63 + wig(2.5, 4),
      hbmGBs: 1900 + wig(40, 5),
    },
    {
      name: "ncclAllReduce_fp16",
      category: "comm",
      pctTime: 22 + wig(1.6, 6),
      nvlinkGBs: 1450 + wig(60, 7),
    },
    {
      name: "cudaMemcpy_DtoD",
      category: "memcpy",
      pctTime: 4 + wig(0.5, 8),
    },
    {
      name: "elementwise_add_fp16",
      category: "other",
      pctTime: 7 + wig(0.8, 9),
    },
    {
      name: "softmax_fp16",
      category: "other",
      pctTime: 3 + wig(0.4, 10),
    },
  ];
}

const COLORS: Record<Kernel["category"], string> = {
  matmul: "#f87171",
  attention: "#fb923c",
  comm: "#a855f7",
  memcpy: "#94a3b8",
  other: "#475569",
};

export function GPUProfileLayer() {
  const visible = useActiveLayerId() === "gpu-profile";
  if (!visible) return null;
  return <ProfilePanel />;
}

function ProfilePanel() {
  const [kernels, setKernels] = useState<Kernel[]>(() => sampleKernels(0));
  useFrame(({ clock }) => {
    const next = sampleKernels(clock.elapsedTime);
    setKernels((prev) => {
      const enough = next.every(
        (n, i) => Math.abs(n.pctTime - prev[i].pctTime) < 0.2,
      );
      return enough ? prev : next;
    });
  });
  return (
    <LayerHtml
      position={[
        COMPUTE_TRAY_ORIGIN.x + 0.55,
        COMPUTE_TRAY_ORIGIN.y + 1.6,
        COMPUTE_TRAY_ORIGIN.z,
      ]}
      style={{ pointerEvents: "none", transform: "translate(-100%, -100%)" }}
    >
      <div className="gp-panel">
        <div className="gp-panel__head">
          <span className="gp-panel__chip">CUPTI · per-kernel</span>
          <span className="gp-panel__src">last 1 s · 50k samples</span>
        </div>
        <div className="gp-bar">
          {kernels.map((k) => (
            <span
              key={k.name}
              className="gp-bar__seg"
              style={{
                flex: k.pctTime,
                background: COLORS[k.category],
              }}
              title={`${k.name} · ${k.pctTime.toFixed(1)}%`}
            />
          ))}
        </div>
        <ul className="gp-list">
          {kernels.map((k) => (
            <li key={k.name}>
              <span
                className="gp-dot"
                style={{ background: COLORS[k.category] }}
              />
              <span className="gp-name">{k.name}</span>
              <span className="gp-pct">{k.pctTime.toFixed(1)}%</span>
              <span className="gp-extra">
                {k.tcUtil != null ? `TC ${k.tcUtil.toFixed(0)}%` : ""}
                {k.hbmGBs != null ? ` · HBM ${(k.hbmGBs / 1000).toFixed(1)} TB/s` : ""}
                {k.nvlinkGBs != null ? ` · NVL ${(k.nvlinkGBs / 1000).toFixed(2)} TB/s` : ""}
              </span>
            </li>
          ))}
        </ul>
        <p className="gp-foot">
          Workload fingerprint. Real LLM training has a known FLOP/byte ratio.
        </p>
      </div>
      <style jsx>{`
        .gp-panel {
          width: 388px;
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
        .gp-panel__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .gp-panel__chip {
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #fca5a5;
        }
        .gp-panel__src {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.55);
        }
        .gp-bar {
          display: flex;
          height: 8px;
          width: 100%;
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 6px;
        }
        .gp-bar__seg {
          transition: flex 0.25s linear;
        }
        .gp-list {
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .gp-list li {
          display: grid;
          grid-template-columns: 8px 1fr auto auto;
          gap: 6px;
          align-items: center;
          padding: 1.5px 0;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.85);
        }
        .gp-dot {
          width: 6px;
          height: 6px;
          border-radius: 999px;
        }
        .gp-pct {
          color: rgba(255, 255, 255, 0.92);
          font-weight: 600;
        }
        .gp-extra {
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.55);
        }
        .gp-foot {
          margin: 6px 0 0;
          padding-top: 6px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </LayerHtml>
  );
}
