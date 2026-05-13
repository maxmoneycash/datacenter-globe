"use client";

import { useActiveLayerId } from "@tour/lib/store";
import { RACK_FOCUS_BILLBOARD } from "@tour/lib/layerAnchors";
import { LayerHtml } from "./LayerHtml";

export function HostProcessLayer() {
  const visible = useActiveLayerId() === "host-process";
  if (!visible) return null;
  return <HostPanel />;
}

function HostPanel() {
  return (
    <LayerHtml
      position={[
        RACK_FOCUS_BILLBOARD.x,
        RACK_FOCUS_BILLBOARD.y,
        RACK_FOCUS_BILLBOARD.z,
      ]}
      style={{ pointerEvents: "none", transform: "translate(-50%, -100%)" }}
    >
      <div className="hp-panel">
        <div className="hp-panel__head">
          <span className="hp-panel__chip">host · h-A07-22</span>
          <span className="hp-panel__src">audit + eBPF</span>
        </div>
        <ul className="hp-meta">
          <li>
            <span>Kernel</span>
            <span>6.8.0-tdx · attested</span>
          </li>
          <li>
            <span>Boot mode</span>
            <span className="hp-meta__ok">measured · UEFI Secure Boot</span>
          </li>
          <li>
            <span>Container runtime</span>
            <span>containerd 1.7</span>
          </li>
        </ul>
        <div className="hp-procs__head">top processes (cgroup-aware)</div>
        <table className="hp-procs">
          <thead>
            <tr>
              <th>pid</th>
              <th>image (digest)</th>
              <th>cpu%</th>
              <th>rss</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>2384</td>
              <td>train:abc123…</td>
              <td>1842%</td>
              <td>312 GB</td>
            </tr>
            <tr>
              <td>2390</td>
              <td>nccl-helper:def456…</td>
              <td>187%</td>
              <td>4 GB</td>
            </tr>
            <tr>
              <td>2401</td>
              <td>dcgm-exporter:7e91…</td>
              <td>4%</td>
              <td>148 MB</td>
            </tr>
            <tr>
              <td>2410</td>
              <td>node-exporter:9c2f…</td>
              <td>1%</td>
              <td>22 MB</td>
            </tr>
          </tbody>
        </table>
        <p className="hp-foot">
          Anchored as deeply as the boot chain. Without TDX/SEV, all of this
          is whatever the running kernel says it is.
        </p>
      </div>
      <style jsx>{`
        .hp-panel {
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
        .hp-panel__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .hp-panel__chip {
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #fca5a5;
        }
        .hp-panel__src {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.55);
        }
        .hp-meta {
          margin: 0 0 6px;
          padding: 0;
          list-style: none;
        }
        .hp-meta li {
          display: flex;
          justify-content: space-between;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 10px;
          padding: 1.5px 0;
          color: rgba(255, 255, 255, 0.85);
        }
        .hp-meta li > span:first-child {
          color: rgba(255, 255, 255, 0.5);
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
        }
        .hp-meta__ok {
          color: #4ade80;
        }
        .hp-procs__head {
          font-size: 9px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
          margin: 4px 0 2px;
        }
        .hp-procs {
          width: 100%;
          border-collapse: collapse;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 10px;
        }
        .hp-procs th {
          text-align: left;
          font-weight: normal;
          font-size: 9px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.42);
          padding: 1px 4px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .hp-procs td {
          padding: 1.5px 4px;
          color: rgba(255, 255, 255, 0.85);
        }
        .hp-foot {
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
