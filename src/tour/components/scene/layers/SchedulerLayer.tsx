"use client";

import { useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useActiveLayerId } from "@tour/lib/store";
import { RACK_FOCUS_BILLBOARD } from "@tour/lib/layerAnchors";
import { LayerHtml } from "./LayerHtml";

type Job = {
  id: string;
  owner: string;
  gpus: number;
  state: "RUNNING" | "QUEUED" | "DONE" | "FAILED";
  startMin: number;
  exit: string;
};

const JOBS_BASE: Job[] = [
  { id: "j-91234", owner: "alice@anthropic", gpus: 1024, state: "RUNNING", startMin: 712, exit: "—" },
  { id: "j-91235", owner: "bob@redteam", gpus: 64, state: "RUNNING", startMin: 91, exit: "—" },
  { id: "j-91236", owner: "carol@evals", gpus: 8, state: "RUNNING", startMin: 18, exit: "—" },
  { id: "j-91230", owner: "dave@infra", gpus: 32, state: "DONE", startMin: 0, exit: "0" },
  { id: "j-91229", owner: "eve@audit", gpus: 4, state: "DONE", startMin: 0, exit: "0" },
  { id: "j-91228", owner: "frank@cust42", gpus: 256, state: "FAILED", startMin: 0, exit: "OOM" },
  { id: "j-91237", owner: "grace@queued", gpus: 4096, state: "QUEUED", startMin: -1, exit: "—" },
];

export function SchedulerLayer() {
  const visible = useActiveLayerId() === "scheduler";
  if (!visible) return null;
  return (
    <group>
      <SchedulerPanel />
    </group>
  );
}

function SchedulerPanel() {
  const [tick, setTick] = useState(0);
  useFrame(({ clock }) => {
    const t = Math.floor(clock.elapsedTime * 0.5);
    if (t !== tick) setTick(t);
  });
  return (
    <LayerHtml
      position={[
        RACK_FOCUS_BILLBOARD.x,
        RACK_FOCUS_BILLBOARD.y,
        RACK_FOCUS_BILLBOARD.z,
      ]}
      style={{
        pointerEvents: "none",
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="sc-panel">
        <div className="sc-panel__head">
          <span className="sc-panel__chip">Slurm · squeue</span>
          <span className="sc-panel__src">queue depth · 47 · GPU avail · 6,392</span>
        </div>
        <table className="sc-panel__table">
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>gpus</th>
              <th>state</th>
              <th>elapsed</th>
              <th>exit</th>
            </tr>
          </thead>
          <tbody>
            {JOBS_BASE.map((j) => (
              <tr key={j.id} className={`sc-row sc-row--${j.state.toLowerCase()}`}>
                <td>{j.id}</td>
                <td>{j.owner}</td>
                <td>{j.gpus.toLocaleString()}</td>
                <td>
                  <span className={`sc-state sc-state--${j.state.toLowerCase()}`}>
                    {j.state}
                  </span>
                </td>
                <td>
                  {j.state === "RUNNING"
                    ? `${Math.floor((j.startMin + tick) / 60)}h ${(j.startMin + tick) % 60}m`
                    : j.state === "QUEUED"
                      ? "—"
                      : "—"}
                </td>
                <td>{j.exit}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="sc-panel__foot">
          Reserved compute, not done compute. A faked job has no power-curve
          fingerprint.
        </p>
      </div>
      <style jsx>{`
        .sc-panel {
          width: 460px;
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
        .sc-panel__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .sc-panel__chip {
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #fca5a5;
        }
        .sc-panel__src {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.55);
        }
        .sc-panel__table {
          width: 100%;
          border-collapse: collapse;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 10px;
        }
        .sc-panel__table th {
          text-align: left;
          font-weight: normal;
          font-size: 9px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
          padding: 2px 6px 2px 4px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .sc-panel__table td {
          padding: 2px 6px 2px 4px;
          color: rgba(255, 255, 255, 0.85);
        }
        .sc-state {
          padding: 1px 6px;
          border-radius: 999px;
          font-size: 9px;
          letter-spacing: 0.1em;
        }
        .sc-state--running {
          background: rgba(34, 197, 94, 0.2);
          color: #86efac;
        }
        .sc-state--queued {
          background: rgba(148, 163, 184, 0.18);
          color: #cbd5e1;
        }
        .sc-state--done {
          background: rgba(59, 130, 246, 0.2);
          color: #93c5fd;
        }
        .sc-state--failed {
          background: rgba(239, 68, 68, 0.22);
          color: #fca5a5;
        }
        .sc-panel__foot {
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
