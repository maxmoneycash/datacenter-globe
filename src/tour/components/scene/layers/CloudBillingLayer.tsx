"use client";

import { useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useActiveLayerId } from "@tour/lib/store";
import { LayerHtml } from "./LayerHtml";

// Panel hovers over the south facade of the building, in the camera's
// frame for the cloud-billing tour stop. Cloud APIs aren't physically tied
// to any module, so we just pick an out-of-the-way spot above the shell.
const PANEL_WORLD = { x: -10, y: 0, z: 10 } as const;

type ApiCall = {
  ts: string;
  principal: string;
  action: string;
  resource: string;
  meter?: string;
};

const CALLS: ApiCall[] = [
  { ts: "12:14:01", principal: "alice@anthropic", action: "POST", resource: "/clusters/c-9/jobs", meter: "+1024 GPU·h" },
  { ts: "12:14:03", principal: "alice@anthropic", action: "GET ", resource: "/clusters/c-9/jobs/j-91234" },
  { ts: "12:14:09", principal: "frank@cust42", action: "POST", resource: "/objects/training-set-7", meter: "+812 GiB" },
  { ts: "12:14:14", principal: "alice@anthropic", action: "PATCH", resource: "/jobs/j-91234/scale", meter: "→ 2048 GPUs" },
  { ts: "12:14:21", principal: "carol@evals", action: "POST", resource: "/inference/batch", meter: "+8 GPU·h" },
  { ts: "12:14:28", principal: "audit@regulator", action: "GET ", resource: "/billing/invoices/2026-04" },
];

export function CloudBillingLayer() {
  const visible = useActiveLayerId() === "cloud-billing";
  if (!visible) return null;
  return <BillingPanel />;
}

function BillingPanel() {
  const [hoursThisMin, setHoursThisMin] = useState(412);
  useFrame(({ clock }) => {
    const next = Math.floor(412 + Math.sin(clock.elapsedTime * 0.4) * 6);
    if (next !== hoursThisMin) setHoursThisMin(next);
  });
  return (
    <LayerHtml
      position={[PANEL_WORLD.x, PANEL_WORLD.y + 6, PANEL_WORLD.z]}
      style={{
        pointerEvents: "none",
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="cb-panel">
        <div className="cb-panel__head">
          <span className="cb-panel__chip">cloud control plane · billing</span>
          <span className="cb-panel__src">FOCUS schema · ~10⁴ events/s</span>
        </div>
        <ul className="cb-log">
          {CALLS.map((c, i) => (
            <li key={i} className="cb-row">
              <span className="cb-row__ts">{c.ts}</span>
              <span className={`cb-row__verb cb-row__verb--${c.action.trim().toLowerCase()}`}>
                {c.action}
              </span>
              <span className="cb-row__resource">{c.resource}</span>
              {c.meter && <span className="cb-row__meter">{c.meter}</span>}
            </li>
          ))}
        </ul>
        <div className="cb-totals">
          <div>
            <span className="cb-totals__label">last 60 s</span>
            <span className="cb-totals__value">{hoursThisMin} GPU·h</span>
          </div>
          <div>
            <span className="cb-totals__label">MTD invoice</span>
            <span className="cb-totals__value">$ 18.4 M</span>
          </div>
          <div>
            <span className="cb-totals__label">tax filing match</span>
            <span className="cb-totals__value cb-totals__value--ok">✓</span>
          </div>
        </div>
      </div>
      <style jsx>{`
        .cb-panel {
          width: 412px;
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
        .cb-panel__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .cb-panel__chip {
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #fbbf24;
        }
        .cb-panel__src {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.55);
        }
        .cb-log {
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .cb-row {
          display: grid;
          grid-template-columns: 60px 36px 1fr auto;
          gap: 6px;
          align-items: center;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 10px;
          padding: 1.5px 0;
          color: rgba(255, 255, 255, 0.85);
        }
        .cb-row__ts {
          color: rgba(255, 255, 255, 0.42);
        }
        .cb-row__verb {
          font-size: 9px;
          letter-spacing: 0.06em;
          text-align: right;
          padding: 1px 4px;
          border-radius: 4px;
        }
        .cb-row__verb--get {
          background: rgba(59, 130, 246, 0.18);
          color: #93c5fd;
        }
        .cb-row__verb--post {
          background: rgba(34, 197, 94, 0.18);
          color: #86efac;
        }
        .cb-row__verb--patch {
          background: rgba(168, 85, 247, 0.18);
          color: #d8b4fe;
        }
        .cb-row__resource {
          color: rgba(255, 255, 255, 0.92);
        }
        .cb-row__meter {
          color: #fbbf24;
          font-size: 9.5px;
        }
        .cb-totals {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          margin-top: 6px;
          padding-top: 6px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .cb-totals > div {
          display: flex;
          flex-direction: column;
        }
        .cb-totals__label {
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
        }
        .cb-totals__value {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 12px;
          font-weight: 600;
          color: #fbbf24;
        }
        .cb-totals__value--ok {
          color: #4ade80;
        }
      `}</style>
    </LayerHtml>
  );
}
