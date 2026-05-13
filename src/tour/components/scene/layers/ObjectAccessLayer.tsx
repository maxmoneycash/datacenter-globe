"use client";

import { useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useActiveLayerId } from "@tour/lib/store";
import { LayerHtml } from "./LayerHtml";

const STORAGE_WORLD = { x: 16, y: 0, z: -8 } as const;

type AccessLine = {
  ts: string;
  principal: string;
  bucket: string;
  key: string;
  size: string;
  status: number;
};

const LINES: AccessLine[] = [
  { ts: "12:14:01.219", principal: "j-91234", bucket: "training-set-7", key: "shards/0042.parquet", size: "1.4 GiB", status: 200 },
  { ts: "12:14:01.234", principal: "j-91234", bucket: "training-set-7", key: "shards/0043.parquet", size: "1.4 GiB", status: 200 },
  { ts: "12:14:01.249", principal: "j-91234", bucket: "training-set-7", key: "shards/0044.parquet", size: "1.4 GiB", status: 200 },
  { ts: "12:14:01.262", principal: "j-91234", bucket: "checkpoints", key: "step-12800.safetensors", size: "412 GiB", status: 200 },
  { ts: "12:14:01.601", principal: "j-91235", bucket: "evals-public", key: "mmlu/test-00000.jsonl", size: "12 MiB", status: 200 },
  { ts: "12:14:01.683", principal: "audit@reg", bucket: "checkpoints", key: "step-12800.safetensors", size: "HEAD", status: 200 },
];

export function ObjectAccessLayer() {
  const visible = useActiveLayerId() === "object-access";
  if (!visible) return null;
  return <AccessPanel />;
}

function AccessPanel() {
  const [tbsRead, setTbsRead] = useState(2.7);
  useFrame(({ clock }) => {
    const next = +(2.7 + Math.sin(clock.elapsedTime * 0.5) * 0.4).toFixed(2);
    if (next !== tbsRead) setTbsRead(next);
  });
  return (
    <LayerHtml
      position={[17, STORAGE_WORLD.y + 5.4, -6.5]}
      style={{ pointerEvents: "none", transform: "translate(-50%, -100%)" }}
    >
      <div className="oa-panel">
        <div className="oa-panel__head">
          <span className="oa-panel__chip">S3 access log · cluster-egress</span>
          <span className="oa-panel__src">{tbsRead.toFixed(2)} TB/s read</span>
        </div>
        <ul className="oa-log">
          {LINES.map((l, i) => (
            <li key={i}>
              <span className="oa-ts">{l.ts}</span>
              <span className="oa-principal">{l.principal}</span>
              <span className="oa-resource">
                {l.bucket}/<em>{l.key}</em>
              </span>
              <span className="oa-size">{l.size}</span>
              <span
                className={`oa-status oa-status--${l.status < 300 ? "ok" : "err"}`}
              >
                {l.status}
              </span>
            </li>
          ))}
        </ul>
        <p className="oa-foot">
          Petabytes per training run, all logged. Useful for data-provenance
          arguments — and for falsifying denial-of-reading claims against the logs.
        </p>
      </div>
      <style jsx>{`
        .oa-panel {
          width: 460px;
          padding: 9px 11px;
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.92);
          background: rgba(8, 12, 18, 0.85);
          border: 1px solid rgba(59, 130, 246, 0.4);
          border-radius: 12px;
          backdrop-filter: blur(12px) saturate(140%);
          -webkit-backdrop-filter: blur(12px) saturate(140%);
          box-shadow: 0 10px 32px rgba(0, 0, 0, 0.55);
          user-select: none;
        }
        .oa-panel__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .oa-panel__chip {
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #93c5fd;
        }
        .oa-panel__src {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 9.5px;
          color: #93c5fd;
        }
        .oa-log {
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .oa-log li {
          display: grid;
          grid-template-columns: 80px 70px 1fr 60px 32px;
          gap: 6px;
          align-items: baseline;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 9.5px;
          padding: 1px 0;
          color: rgba(255, 255, 255, 0.85);
        }
        .oa-ts {
          color: rgba(255, 255, 255, 0.42);
        }
        .oa-principal {
          color: #93c5fd;
        }
        .oa-resource em {
          font-style: normal;
          color: rgba(255, 255, 255, 0.92);
        }
        .oa-size {
          text-align: right;
          color: rgba(255, 255, 255, 0.7);
        }
        .oa-status {
          text-align: center;
          font-size: 9px;
          padding: 1px 4px;
          border-radius: 4px;
        }
        .oa-status--ok {
          background: rgba(34, 197, 94, 0.18);
          color: #86efac;
        }
        .oa-status--err {
          background: rgba(239, 68, 68, 0.22);
          color: #fca5a5;
        }
        .oa-foot {
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
