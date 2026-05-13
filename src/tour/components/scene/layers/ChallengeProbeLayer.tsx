"use client";

import { useMemo, useRef, useState } from "react";
import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  CatmullRomCurve3,
  Vector3,
  type Mesh,
  type MeshStandardMaterial,
} from "three";
import { useActiveLayerId } from "@tour/lib/store";
import { palette } from "@tour/lib/palette";
import { LayerHtml } from "./LayerHtml";

/**
 * Visualization of an external auditor sending a fresh challenge to the
 * featured GPU and getting back a hardware-signed response. The probe
 * travels along a curved path from outside the building into the rack and
 * back. The HUD on each end shows the request payload and the signed
 * response.
 */

const AUDITOR_WORLD = new Vector3(-22, 11, 24); // out front, above the substation
const RACK_WORLD = new Vector3(0, 3.2, -2);

const REQUEST_CURVE = new CatmullRomCurve3(
  [
    AUDITOR_WORLD.clone(),
    new Vector3(-12, 9, 14),
    new Vector3(-4, 6, 6),
    new Vector3(-1, 4.2, 0),
    RACK_WORLD.clone(),
  ],
  false,
  "catmullrom",
  0.6,
);

// One full probe cycle takes this many seconds.
const CYCLE_S = 5;

export function ChallengeProbeLayer() {
  const visible = useActiveLayerId() === "challenge-probe";
  if (!visible) return null;
  return (
    <group>
      <ChannelLine />
      <ProbeBead />
      <AuditorEndpoint />
      <RackEndpoint />
    </group>
  );
}

function ChannelLine() {
  const points = useMemo(() => {
    const N = 64;
    return Array.from({ length: N + 1 }, (_, i) =>
      REQUEST_CURVE.getPointAt(i / N),
    );
  }, []);
  return (
    <Line
      points={points}
      color={palette.verify}
      lineWidth={1.2}
      transparent
      opacity={0.55}
      dashed
      dashSize={0.5}
      gapSize={0.35}
    />
  );
}

/**
 * The probe travels: outbound (request, neutral white) for half the cycle,
 * inbound (response, gold) for the other half. Just before the inbound
 * trip starts we also pulse the rack endpoint so it visually "answers".
 */
function ProbeBead() {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.elapsedTime % CYCLE_S) / CYCLE_S;
    const outbound = t < 0.5;
    const u = outbound ? t / 0.5 : 1 - (t - 0.5) / 0.5;
    const p = REQUEST_CURVE.getPointAt(u);
    ref.current.position.copy(p);
    const mat = ref.current.material as MeshStandardMaterial;
    mat.color.set(outbound ? "#ffffff" : palette.verify);
    mat.emissive.set(outbound ? "#ffffff" : palette.verify);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.08, 16, 12]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#ffffff"
        emissiveIntensity={1}
        toneMapped={false}
      />
    </mesh>
  );
}

function AuditorEndpoint() {
  return (
    <group>
      {/* A small "auditor box" mesh */}
      <mesh position={AUDITOR_WORLD.toArray()}>
        <boxGeometry args={[1, 0.6, 0.6]} />
        <meshStandardMaterial
          color="#1f2937"
          emissive={palette.verify}
          emissiveIntensity={0.25}
          metalness={0.3}
          roughness={0.6}
        />
      </mesh>
      <LayerHtml
        position={[
          AUDITOR_WORLD.x,
          AUDITOR_WORLD.y + 0.8,
          AUDITOR_WORLD.z,
        ]}
        style={{ pointerEvents: "none", transform: "translate(0, -100%)" }}
      >
        <div className="cp-auditor">
          <div className="cp-auditor__head">
            <span className="cp-auditor__chip">independent auditor</span>
            <span className="cp-auditor__dot" />
          </div>
          <div className="cp-auditor__body">
            <span className="cp-auditor__label">challenge</span>
            <span className="cp-auditor__nonce">nonce 9f3c2d1e7a4b8c5d</span>
            <span className="cp-auditor__label">expects</span>
            <span className="cp-auditor__expect">attested matmul · 768×768</span>
          </div>
        </div>
        <style jsx>{`
          .cp-auditor {
            width: 224px;
            padding: 8px 10px;
            font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
            font-size: 11px;
            color: rgba(255, 255, 255, 0.92);
            background: rgba(8, 12, 18, 0.85);
            border: 1px solid rgba(250, 204, 21, 0.45);
            border-radius: 10px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
          }
          .cp-auditor__head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
          }
          .cp-auditor__chip {
            font-size: 9.5px;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: #facc15;
          }
          .cp-auditor__dot {
            width: 6px;
            height: 6px;
            border-radius: 999px;
            background: #facc15;
            box-shadow: 0 0 8px #facc15;
          }
          .cp-auditor__body {
            display: grid;
            grid-template-columns: 60px 1fr;
            gap: 2px 6px;
            font-family: ui-monospace, "SF Mono", Menlo, monospace;
            font-size: 10px;
          }
          .cp-auditor__label {
            color: rgba(255, 255, 255, 0.45);
            font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
            font-size: 9px;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }
          .cp-auditor__nonce {
            color: #ffffff;
          }
          .cp-auditor__expect {
            color: #facc15;
          }
        `}</style>
      </LayerHtml>
    </group>
  );
}

function RackEndpoint() {
  // Pulse a halo on the rack when the probe arrives (around t = 0.5 of the cycle).
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.elapsedTime % CYCLE_S) / CYCLE_S;
    // Sharp pulse around t=0.5 (arrival) and t=0 (just sent the response).
    const pulse =
      Math.exp(-Math.pow((t - 0.5) * 8, 2)) +
      Math.exp(-Math.pow((t < 0.05 ? t : t - 1) * 18, 2));
    const mat = ref.current.material as MeshStandardMaterial;
    mat.emissiveIntensity = 0.2 + pulse * 1.4;
    const s = 1 + pulse * 0.5;
    ref.current.scale.set(s, s, s);
  });
  const [showResponse, setShowResponse] = useState(false);
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime % CYCLE_S) / CYCLE_S;
    setShowResponse(t > 0.5);
  });
  return (
    <group position={RACK_WORLD.toArray()}>
      <mesh ref={ref} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.3, 0.5, 32]} />
        <meshStandardMaterial
          color={palette.verify}
          emissive={palette.verify}
          emissiveIntensity={0.4}
          toneMapped={false}
          transparent
          opacity={0.85}
        />
      </mesh>
      <LayerHtml
        dockStackOffset={220}
        position={[0.55, 0.4, 0]}
        style={{ pointerEvents: "none", transform: "translate(0, -50%)" }}
      >
        <div
          className={`cp-rack ${showResponse ? "cp-rack--out" : "cp-rack--in"}`}
        >
          <div className="cp-rack__head">
            <span className="cp-rack__chip">attested workload · GPU 0</span>
            <span className="cp-rack__phase">
              {showResponse ? "RESPONSE" : "INCOMING"}
            </span>
          </div>
          {showResponse ? (
            <div className="cp-rack__body">
              <span className="cp-rack__label">echoes nonce</span>
              <span className="cp-rack__mono">9f3c2d1e7a4b8c5d ✓</span>
              <span className="cp-rack__label">measurement</span>
              <span className="cp-rack__mono">8e3a…b29c (matches public)</span>
              <span className="cp-rack__label">latency</span>
              <span className="cp-rack__mono">312 ms · plausible · ✓</span>
              <span className="cp-rack__label">signed by</span>
              <span className="cp-rack__mono">NVIDIA root · ✓</span>
            </div>
          ) : (
            <div className="cp-rack__body cp-rack__body--in">
              <span className="cp-rack__label">received</span>
              <span className="cp-rack__mono">nonce + workload spec</span>
              <span className="cp-rack__label">running</span>
              <span className="cp-rack__mono">attested matmul…</span>
            </div>
          )}
        </div>
        <style jsx>{`
          .cp-rack {
            width: 280px;
            padding: 8px 10px;
            font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
            font-size: 11px;
            color: rgba(255, 255, 255, 0.92);
            background: rgba(8, 12, 18, 0.86);
            border: 1px solid rgba(250, 204, 21, 0.5);
            border-radius: 10px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            box-shadow: 0 6px 24px rgba(0, 0, 0, 0.55);
            transition: border-color 0.2s linear;
          }
          .cp-rack--in {
            border-color: rgba(255, 255, 255, 0.35);
          }
          .cp-rack__head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
          }
          .cp-rack__chip {
            font-size: 9.5px;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: #facc15;
          }
          .cp-rack__phase {
            font-family: ui-monospace, "SF Mono", Menlo, monospace;
            font-size: 9px;
            color: rgba(255, 255, 255, 0.6);
            letter-spacing: 0.1em;
          }
          .cp-rack__body {
            display: grid;
            grid-template-columns: 78px 1fr;
            gap: 2px 6px;
          }
          .cp-rack__label {
            font-size: 9px;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.45);
          }
          .cp-rack__mono {
            font-family: ui-monospace, "SF Mono", Menlo, monospace;
            font-size: 10px;
            color: rgba(255, 255, 255, 0.92);
          }
          .cp-rack--out .cp-rack__mono {
            color: #facc15;
          }
        `}</style>
      </LayerHtml>
    </group>
  );
}
