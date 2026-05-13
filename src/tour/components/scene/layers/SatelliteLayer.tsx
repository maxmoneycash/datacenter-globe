"use client";

import { useRef, useState } from "react";
import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  CatmullRomCurve3,
  Vector3,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
} from "three";
import { useActiveLayerId } from "@tour/lib/store";
import { palette } from "@tour/lib/palette";
import { LayerHtml } from "./LayerHtml";

/**
 * Building origin (the campus is centered around the origin in our scene).
 * The orbit ring is rendered as a tilted ellipse at altitude ~70 m above
 * the building (visually), with the satellite riding the curve.
 */
const ORBIT_CENTER = new Vector3(0, 4, 0);
const ORBIT_RADIUS_X = 64;
const ORBIT_RADIUS_Z = 52;
const ORBIT_HEIGHT = 70;
const ORBIT_TILT = 0.18; // radians

export function SatelliteLayer() {
  const visible = useActiveLayerId() === "satellite";
  if (!visible) return null;

  return (
    <group>
      <OrbitTrack />
      <Satellite />
      <ThermalPlume />
      <SitePinHud />
      <SatelliteHud />
    </group>
  );
}

const ORBIT_POINTS: Vector3[] = (() => {
  const pts: Vector3[] = [];
  const N = 96;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const x = ORBIT_CENTER.x + Math.cos(a) * ORBIT_RADIUS_X;
    const z = ORBIT_CENTER.z + Math.sin(a) * ORBIT_RADIUS_Z;
    const y = ORBIT_CENTER.y + ORBIT_HEIGHT + Math.sin(a) * ORBIT_TILT * 30;
    pts.push(new Vector3(x, y, z));
  }
  return pts;
})();

const ORBIT_CURVE = new CatmullRomCurve3(ORBIT_POINTS, true, "catmullrom", 0.5);

function OrbitTrack() {
  return (
    <Line
      points={ORBIT_POINTS}
      color={palette.verify}
      lineWidth={1}
      transparent
      opacity={0.45}
    />
  );
}

function Satellite() {
  const ref = useRef<Group>(null);
  const bodyRef = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime * 0.06) % 1;
    const p = ORBIT_CURVE.getPointAt(t);
    const tan = ORBIT_CURVE.getTangentAt(t);
    if (ref.current) {
      ref.current.position.copy(p);
      ref.current.lookAt(p.x + tan.x, p.y + tan.y, p.z + tan.z);
    }
    if (bodyRef.current) {
      const m = bodyRef.current.material as MeshStandardMaterial;
      m.emissiveIntensity = 0.7 + Math.sin(clock.elapsedTime * 4) * 0.25;
    }
  });
  return (
    <group ref={ref}>
      <mesh ref={bodyRef}>
        <boxGeometry args={[1.2, 0.6, 0.6]} />
        <meshStandardMaterial
          color="#e5e7eb"
          emissive={palette.verify}
          emissiveIntensity={0.7}
          metalness={0.6}
          roughness={0.3}
          toneMapped={false}
        />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 1.4, 0, 0]}>
          <boxGeometry args={[1.6, 0.04, 0.45]} />
          <meshStandardMaterial
            color="#1d4ed8"
            emissive="#1d4ed8"
            emissiveIntensity={0.25}
            metalness={0.4}
            roughness={0.55}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * A faint upward heat plume above the cooling towers, in pseudo-thermal
 * orange. Suggests "this is what a thermal-imaging satellite picks up".
 */
function ThermalPlume() {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = 1 + Math.sin(clock.elapsedTime * 1.4) * 0.04;
    ref.current.scale.set(s, 1 + Math.sin(clock.elapsedTime * 0.9) * 0.03, s);
  });
  return (
    <group ref={ref} position={[18, 8, 1]}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, i * 1.6, 0]}>
          <sphereGeometry args={[1.2 - i * 0.18, 16, 12]} />
          <meshStandardMaterial
            color={i === 0 ? "#fb923c" : i === 1 ? "#f97316" : "#dc2626"}
            emissive={i === 0 ? "#fb923c" : i === 1 ? "#f97316" : "#dc2626"}
            emissiveIntensity={0.45 - i * 0.1}
            transparent
            opacity={0.35 - i * 0.08}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Pin marker on the building, with the public-record HUD attached to it.
 * Reads as "this is what a stranger looking up the campus from the outside
 * could find — and it lines up with everything the operator says".
 */
function SitePinHud() {
  return (
    <LayerHtml
      position={[-12, 10, -18]}
      style={{ pointerEvents: "none", transform: "translate(0, 0)" }}
    >
      <div className="sl-public">
        <div className="sl-public__head">
          <span className="sl-public__chip">public records</span>
          <span className="sl-public__src">FERC · EIA · customs</span>
        </div>
        <ul className="sl-public__list">
          <li>
            <span>Site name</span>
            <span>NDC-7 · Reno, NV</span>
          </li>
          <li>
            <span>Permitted load</span>
            <span>118 MW</span>
          </li>
          <li>
            <span>Utility 12-mo</span>
            <span>0.91 TWh</span>
          </li>
          <li>
            <span>Customs (B200)</span>
            <span>~73,800 units</span>
          </li>
          <li>
            <span>Substation built</span>
            <span>2024-Q3</span>
          </li>
        </ul>
        <p className="sl-public__foot">
          All from sources outside the operator. Anything the operator says
          must agree with these.
        </p>
      </div>
      <style jsx>{`
        .sl-public {
          width: 248px;
          padding: 10px 12px;
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.92);
          background: rgba(8, 12, 18, 0.82);
          border: 1px solid rgba(250, 204, 21, 0.4);
          border-radius: 12px;
          backdrop-filter: blur(10px) saturate(140%);
          -webkit-backdrop-filter: blur(10px) saturate(140%);
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
          user-select: none;
        }
        .sl-public__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .sl-public__chip {
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #facc15;
        }
        .sl-public__src {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.5);
        }
        .sl-public__list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .sl-public__list li {
          display: flex;
          justify-content: space-between;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 11px;
          padding: 2px 0;
          color: rgba(255, 255, 255, 0.88);
        }
        .sl-public__list li > span:first-child {
          color: rgba(255, 255, 255, 0.55);
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          font-size: 10px;
          letter-spacing: 0.04em;
          text-transform: lowercase;
        }
        .sl-public__foot {
          margin: 6px 0 0;
          padding-top: 6px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.55);
          line-height: 1.35;
        }
      `}</style>
    </LayerHtml>
  );
}

/**
 * The satellite's own HUD — what an analyst with a Sentinel/Landsat
 * subscription can see about the site from orbit.
 */
function SatelliteHud() {
  const [pass, setPass] = useState(() => sampleSatellite(0));
  useFrame(({ clock }) => {
    const next = sampleSatellite(clock.elapsedTime);
    setPass((prev) => {
      if (
        Math.abs(next.thermal - prev.thermal) < 0.1 &&
        Math.abs(next.elevation - prev.elevation) < 0.4
      ) {
        return prev;
      }
      return next;
    });
  });
  return (
    <LayerHtml
      dockStackOffset={240}
      position={[42, 60, -30]}
      style={{ pointerEvents: "none", transform: "translate(0, -100%)" }}
    >
      <div className="sl-sat">
        <div className="sl-sat__head">
          <span className="sl-sat__chip">SENTINEL-2 · pass</span>
          <span className="sl-sat__src">2026-05-09 12:14 UTC</span>
        </div>
        <div className="sl-sat__row">
          <span>Elev.</span>
          <span>{pass.elevation.toFixed(1)}°</span>
        </div>
        <div className="sl-sat__row">
          <span>Thermal Δ</span>
          <span>+{pass.thermal.toFixed(1)} K vs surroundings</span>
        </div>
        <div className="sl-sat__row">
          <span>Cloud cover</span>
          <span>{pass.cloud.toFixed(0)}%</span>
        </div>
        <div className="sl-sat__row sl-sat__row--accent">
          <span>Match</span>
          <span>vs reported MW: ✓ within 4%</span>
        </div>
      </div>
      <style jsx>{`
        .sl-sat {
          width: 244px;
          padding: 9px 12px;
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.92);
          background: rgba(8, 12, 18, 0.82);
          border: 1px solid rgba(250, 204, 21, 0.45);
          border-radius: 12px;
          backdrop-filter: blur(10px) saturate(140%);
          -webkit-backdrop-filter: blur(10px) saturate(140%);
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
          user-select: none;
        }
        .sl-sat__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .sl-sat__chip {
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #facc15;
        }
        .sl-sat__src {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 9.5px;
          color: rgba(255, 255, 255, 0.5);
        }
        .sl-sat__row {
          display: flex;
          justify-content: space-between;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 11px;
          padding: 2px 0;
          color: rgba(255, 255, 255, 0.85);
        }
        .sl-sat__row > span:first-child {
          color: rgba(255, 255, 255, 0.5);
          font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
          font-size: 10px;
          letter-spacing: 0.04em;
        }
        .sl-sat__row--accent {
          color: #4ade80;
          margin-top: 2px;
          padding-top: 4px;
          border-top: 1px dashed rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </LayerHtml>
  );
}

function sampleSatellite(t: number) {
  return {
    elevation: 28 + Math.sin(t * 0.04) * 18,
    thermal: 6.4 + Math.sin(t * 0.13) * 0.3,
    cloud: Math.max(0, Math.min(100, 14 + Math.sin(t * 0.05) * 6)),
  };
}
