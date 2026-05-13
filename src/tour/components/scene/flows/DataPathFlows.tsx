"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CatmullRomCurve3,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from "three";
import { palette } from "@tour/lib/palette";
import {
  HALL_PER_ROW,
  HALL_ROWS,
  hallRackFlowPort,
} from "@tour/lib/computeHallGrid";
import { useAppStore } from "@tour/lib/store";
import {
  CLOUD_EDGE_RELAY_WORLD,
  UTILITY_METERING_HUB_WORLD,
} from "@tour/lib/cloudFlowAnchors";

const PARTICLES_PER_CURVE = 10;

/** Featured rack — GPUs / NIC plane (consumes storage flows, emits cloud metering). */
const HERO_DATA_PORT = new Vector3(0.4, 3.2, -2);
/** Storage JBOD fronts — shards **feed** east–west fabric toward dense compute (reads). */
const STORAGE_INGRESS = new Vector3(12.5, 2.3, -9);
const STORAGE_INGRESS_B = new Vector3(15.8, 2.0, -7.2);
/** Cloud control / metering plane (HUD anchor) — **outbound** API/billing aggregates. */
const CLOUD_BEACON = new Vector3(-10, 6.5, 10);
/** Bend from GPU rack egress before rooftop relay merge. */
const HERO_APPROACH_CLOUD = new Vector3(1.5, 5.85, -1.4);
/** Bend from spine/leaf toward shared relay knot. */
const FABRIC_APPROACH_RELAY = new Vector3(-2.9, 5.95, -5.2);
/** Leaf row near hall — traffic converging toward spine / uplink. */
const FABRIC_EGRESS = new Vector3(-6, 3.8, -8);

/**
 * Inter-rack east–west: curve runs **left → right** (increasing column / +X),
 * i.e. toward the hall side that ties into spine–leaf.
 * North–south: **smaller row index → larger** (+Z / “up the hall”), like hot-aisle
 * air moving toward the network row — one coherent swirl, not alternating ping-pong.
 */
function interRackCurves(): CatmullRomCurve3[] {
  const curves: CatmullRomCurve3[] = [];

  for (let r = 0; r < HALL_ROWS; r++) {
    for (let c = 0; c < HALL_PER_ROW - 1; c++) {
      if ((r + c) % 2 !== 0) continue;
      const a = hallRackFlowPort(r, c);
      const b = hallRackFlowPort(r, c + 1);
      const mid = new Vector3(
        (a.x + b.x) / 2,
        Math.max(a.y, b.y) + 0.35,
        (a.z + b.z) / 2,
      );
      curves.push(new CatmullRomCurve3([a, mid, b]));
    }
  }

  for (let c = 1; c < HALL_PER_ROW; c += 2) {
    for (let r = 0; r < HALL_ROWS - 1; r++) {
      const a = hallRackFlowPort(r, c);
      const b = hallRackFlowPort(r + 1, c);
      const mid = new Vector3(
        (a.x + b.x) / 2,
        Math.max(a.y, b.y) + 0.45,
        (a.z + b.z) / 2,
      );
      curves.push(new CatmullRomCurve3([a, mid, b]));
    }
  }

  return curves.slice(0, 18);
}

function storageCurves(): CatmullRomCurve3[] {
  const mid = new Vector3(
    (HERO_DATA_PORT.x + STORAGE_INGRESS.x) / 2,
    7.2,
    (HERO_DATA_PORT.z + STORAGE_INGRESS.z) / 2,
  );
  const mid2 = new Vector3(
    (HERO_DATA_PORT.x + STORAGE_INGRESS_B.x) / 2,
    6.5,
    (HERO_DATA_PORT.z + STORAGE_INGRESS_B.z) / 2,
  );
  return [
    new CatmullRomCurve3([STORAGE_INGRESS.clone(), mid, HERO_DATA_PORT.clone()]),
    new CatmullRomCurve3([
      STORAGE_INGRESS_B.clone(),
      mid2,
      HERO_DATA_PORT.clone(),
    ]),
  ];
}

function cloudCurves(): CatmullRomCurve3[] {
  /** Roof relay + yard-side hub: avoids a second “kiss” mid-air toward utility power with no mesh. */
  const relay = CLOUD_EDGE_RELAY_WORLD.clone();
  const yardHub = UTILITY_METERING_HUB_WORLD.clone();
  const beacon = CLOUD_BEACON.clone();
  return [
    new CatmullRomCurve3([
      HERO_DATA_PORT.clone(),
      HERO_APPROACH_CLOUD.clone(),
      relay,
      yardHub,
      beacon,
    ]),
    new CatmullRomCurve3([
      FABRIC_EGRESS.clone(),
      FABRIC_APPROACH_RELAY.clone(),
      relay.clone(),
      yardHub.clone(),
      beacon.clone(),
    ]),
  ];
}

function FlowParticles({
  curves,
  color,
  emissiveIntensity,
  particleScale,
  speed,
  opacityMax,
  visibilityScale,
}: {
  curves: CatmullRomCurve3[];
  color: string;
  emissiveIntensity: number;
  particleScale: number;
  speed: number;
  opacityMax: number;
  /** Fade schematic paths when aerial “site overview” would read noisy */
  visibilityScale: number;
}) {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const total = curves.length * PARTICLES_PER_CURVE;

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh || curves.length === 0) return;
    const t = clock.elapsedTime * speed;
    let idx = 0;
    for (let c = 0; c < curves.length; c++) {
      const curve = curves[c];
      for (let p = 0; p < PARTICLES_PER_CURVE; p++) {
        const offset = p / PARTICLES_PER_CURVE;
        let u = (offset + t) % 1;
        if (u < 0) u += 1;
        const pt = curve.getPointAt(u);
        dummy.position.copy(pt);
        const pulse = 0.85 + 0.15 * Math.sin(clock.elapsedTime * 2.1 + p * 0.4);
        dummy.scale.setScalar(particleScale * pulse);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx++, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    const mat = mesh.material as MeshStandardMaterial;
    mat.opacity =
      visibilityScale *
      opacityMax *
      (0.88 + 0.08 * Math.sin(clock.elapsedTime * 0.4));
  });

  if (total === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, total]}>
      <sphereGeometry args={[1, 7, 7]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={emissiveIntensity}
        toneMapped={false}
        transparent
        opacity={opacityMax}
        depthWrite={false}
        depthTest
      />
    </instancedMesh>
  );
}

/**
 * Always-on schematic traffic (curve **start → end**):
 * - **Inter-rack** — inside the hall, +X / +Z aggregation (no ping-pong).
 * - **Storage** — flash/object → featured GPU rack (dataset **read**).
 * - **Cloud** — rack & fabric → billing / control HUD (**outbound** metering & API logs).
 */
export function DataPathFlows() {
  const interRack = useMemo(() => interRackCurves(), []);
  const storage = useMemo(() => storageCurves(), []);
  const cloud = useMemo(() => cloudCurves(), []);

  /** Site intro is about the enclosure; teal/gold datapath arcs read as stray noise from orbit. */
  const mode = useAppStore((s) => s.mode);
  const tourStep = useAppStore((s) => s.tourStep);
  const aerialIntro = mode === "tour" && tourStep === 0;
  const visibilityScale = aerialIntro ? 0.06 : 1;

  return (
    <group>
      <FlowParticles
        curves={interRack}
        color={palette.fabric}
        emissiveIntensity={1.25}
        particleScale={0.038}
        speed={0.55}
        opacityMax={0.42}
        visibilityScale={visibilityScale}
      />
      <FlowParticles
        curves={storage}
        color={palette.storage}
        emissiveIntensity={1.5}
        particleScale={0.045}
        speed={0.32}
        opacityMax={0.48}
        visibilityScale={visibilityScale}
      />
      <FlowParticles
        curves={cloud}
        color={palette.verify}
        emissiveIntensity={1.4}
        particleScale={0.04}
        speed={0.24}
        opacityMax={0.44}
        visibilityScale={visibilityScale}
      />
    </group>
  );
}
