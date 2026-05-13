"use client";

import { useActiveLayerId } from "@tour/lib/store";
import { RACK_FOCUS_BILLBOARD } from "@tour/lib/layerAnchors";
import { LayerHtml } from "./LayerHtml";

export function AttestationLayer() {
  const visible = useActiveLayerId() === "attestation";
  if (!visible) return null;
  return <AttestationPanel />;
}

function AttestationPanel() {
  return (
    <LayerHtml
      position={[
        RACK_FOCUS_BILLBOARD.x,
        RACK_FOCUS_BILLBOARD.y,
        RACK_FOCUS_BILLBOARD.z,
      ]}
      style={{ pointerEvents: "none", transform: "translate(-50%, -100%)" }}
    >
      <div className="at-panel">
        <div className="at-panel__head">
          <span className="at-panel__chip">attestation quote · NV-CC</span>
          <span className="at-panel__src">RA-TLS · root: NVIDIA</span>
        </div>
        <pre className="at-quote">
{`{
  "tcb": {
    "vbios":     "94.04.4F.00.21",
    "driver":    "555.42.06-cc",
    "gpu_image": "blackwell-cc-ga-2026-04",
  },
  "measurements": {
    "pcr0":  "a1b2c3...3f9e",
    "pcr8":  "f7e6d5...0c1d",
    "gpu0":  "8e3a...b29c"
  },
  "nonce":     "9f3c2d1e7a4b8c5d",
  "user_data": "j-91234 · step-12800",
  "signature": "302502...c1f4e2"
}`}
        </pre>
        <ul className="at-checks">
          <li>
            <span>vendor root cert</span>
            <span className="at-ok">✓ NVIDIA · 2024</span>
          </li>
          <li>
            <span>measurement vs reference</span>
            <span className="at-ok">✓ matches public release</span>
          </li>
          <li>
            <span>nonce echo</span>
            <span className="at-ok">✓ fresh, &lt; 2 s old</span>
          </li>
        </ul>
        <p className="at-foot">
          The only signal in this stack that does not require trusting the
          operator — only the silicon vendor.
        </p>
      </div>
      <style jsx>{`
        .at-panel {
          width: 388px;
          padding: 9px 11px;
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.92);
          background: rgba(8, 12, 18, 0.88);
          border: 1px solid rgba(250, 204, 21, 0.45);
          border-radius: 12px;
          backdrop-filter: blur(12px) saturate(140%);
          -webkit-backdrop-filter: blur(12px) saturate(140%);
          box-shadow: 0 10px 32px rgba(0, 0, 0, 0.55);
          user-select: none;
        }
        .at-panel__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .at-panel__chip {
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #facc15;
        }
        .at-panel__src {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.55);
        }
        .at-quote {
          margin: 0 0 6px;
          padding: 7px 9px;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 10px;
          line-height: 1.45;
          color: #facc15;
          background: rgba(0, 0, 0, 0.42);
          border-radius: 8px;
          border: 1px solid rgba(250, 204, 21, 0.18);
          white-space: pre;
          overflow: hidden;
        }
        .at-checks {
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .at-checks li {
          display: flex;
          justify-content: space-between;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 10px;
          padding: 1.5px 0;
          color: rgba(255, 255, 255, 0.85);
        }
        .at-checks li > span:first-child {
          color: rgba(255, 255, 255, 0.5);
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
        }
        .at-ok {
          color: #4ade80;
        }
        .at-foot {
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
