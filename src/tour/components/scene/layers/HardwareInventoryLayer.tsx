"use client";

import { Html } from "@react-three/drei";
import { useActiveLayerId } from "@tour/lib/store";
import {
  FEATURED_RACK_BASE,
  RACK_FOCUS_BILLBOARD,
} from "@tour/lib/layerAnchors";
import { LayerHtml } from "./LayerHtml";

/**
 * Hardware Inventory is a control-plane signal: it lives in a database, not
 * on the equipment. Visualization is a small spreadsheet-style row dump
 * floating in front of the rack, with a few of the rack's serial-numbered
 * components labeled in 3D so the abstract rows feel anchored to physical
 * things.
 */
const ROWS: Array<{
  rack: string;
  slot: string;
  serial: string;
  model: string;
  installed: string;
}> = [
  { rack: "R-A07", slot: "tray-22", serial: "SN-B200-3F19A0", model: "B200-SXM5", installed: "2025-06-12" },
  { rack: "R-A07", slot: "tray-22", serial: "SN-B200-3F19A1", model: "B200-SXM5", installed: "2025-06-12" },
  { rack: "R-A07", slot: "tray-22", serial: "SN-B200-3F19A2", model: "B200-SXM5", installed: "2025-06-12" },
  { rack: "R-A07", slot: "tray-22", serial: "SN-B200-3F19A3", model: "B200-SXM5", installed: "2025-06-12" },
  { rack: "R-A07", slot: "nvsw-9", serial: "SN-NVSW-22B14", model: "NVSwitch-5", installed: "2025-06-12" },
  { rack: "R-A07", slot: "psu-1", serial: "SN-PSU-83C0E", model: "DC-PSU-12kW", installed: "2025-06-10" },
];

export function HardwareInventoryLayer() {
  const visible = useActiveLayerId() === "hw-inventory";
  if (!visible) return null;
  return (
    <group>
      <InventoryPanel />
      {/* Pin a serial sticker on the featured tray + one switch tray */}
      <SerialPin
        position={[
          FEATURED_RACK_BASE.x + 0.55,
          FEATURED_RACK_BASE.y + 3.05,
          FEATURED_RACK_BASE.z,
        ]}
        text="SN-B200-3F19A0…3"
      />
      <SerialPin
        position={[
          FEATURED_RACK_BASE.x + 0.55,
          FEATURED_RACK_BASE.y + 3.18,
          FEATURED_RACK_BASE.z,
        ]}
        text="SN-NVSW-22B14"
      />
    </group>
  );
}

function InventoryPanel() {
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
      <div className="hw-panel">
        <div className="hw-panel__head">
          <span className="hw-panel__chip">DCIM · asset table</span>
          <span className="hw-panel__src">~10⁶ rows site-wide</span>
        </div>
        <table className="hw-panel__table">
          <thead>
            <tr>
              <th>rack</th>
              <th>slot</th>
              <th>serial</th>
              <th>model</th>
              <th>installed</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.serial}>
                <td>{r.rack}</td>
                <td>{r.slot}</td>
                <td>{r.serial}</td>
                <td>{r.model}</td>
                <td>{r.installed}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hw-panel__foot">
          One row per chip / switch / PSU. Joined against TPM responses,
          customs imports, and vendor sales records.
        </p>
      </div>
      <style jsx>{`
        .hw-panel {
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
        .hw-panel__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .hw-panel__chip {
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #fca5a5;
        }
        .hw-panel__src {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.5);
        }
        .hw-panel__table {
          width: 100%;
          border-collapse: collapse;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 10px;
        }
        .hw-panel__table th {
          text-align: left;
          font-weight: normal;
          font-size: 9px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
          padding: 2px 4px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .hw-panel__table td {
          padding: 2px 4px;
          color: rgba(255, 255, 255, 0.85);
        }
        .hw-panel__table tbody tr:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        .hw-panel__foot {
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

function SerialPin({
  position,
  text,
}: {
  position: [number, number, number];
  text: string;
}) {
  return (
    <Html position={position} style={{ pointerEvents: "none" }}>
      <div className="hw-pin">
        <span className="hw-pin__dot" />
        <span className="hw-pin__text">{text}</span>
      </div>
      <style jsx>{`
        .hw-pin {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.85);
          background: rgba(8, 12, 18, 0.78);
          border: 1px solid rgba(255, 77, 79, 0.4);
          padding: 2px 7px;
          border-radius: 6px;
          white-space: nowrap;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .hw-pin__dot {
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: #ff4d4f;
        }
      `}</style>
    </Html>
  );
}
