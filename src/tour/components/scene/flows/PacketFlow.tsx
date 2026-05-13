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
import { useAppStore } from "@tour/lib/store";
import { FABRIC_LEAF_POS, FABRIC_SPINE_POS } from "../modules/NetworkFabric";
import { COMPUTE_NODE_GPU_OFFSETS } from "../modules/ComputeNode";

type PacketKind = "nvlinkPackets" | "fabricPackets";

const PARTICLES_PER_CURVE = 12;

export function PacketFlow({ id }: { id: PacketKind }) {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const startTimeRef = useRef<number | null>(null);
  const lastNonceRef = useRef(0);

  const color = id === "nvlinkPackets" ? palette.nvlink : palette.fabric;

  const curves = useMemo(() => {
    const out: CatmullRomCurve3[] = [];
    if (id === "nvlinkPackets") {
      const trayWorld = (slotIndex: number, slot0Y = 0.36, gap = 0.12) =>
        new Vector3(0, slot0Y + slotIndex * gap, -2);
      const switchSlots = [2, 5, 8, 11, 14, 17, 20];
      for (const [gx, gz] of COMPUTE_NODE_GPU_OFFSETS) {
        const gpuWorld = new Vector3(gx, 3.39, -2 + gz);
        for (const slot of switchSlots) {
          const switchPos = new Vector3(0, 0.36 + slot * 0.12, -2 - 0.7);
          const mid = new Vector3(
            (gpuWorld.x + switchPos.x) / 2,
            (gpuWorld.y + switchPos.y) / 2,
            (gpuWorld.z + switchPos.z) / 2 - 0.05,
          );
          out.push(new CatmullRomCurve3([gpuWorld, mid, switchPos]));
        }
      }
      void trayWorld;
    } else {
      for (const sp of FABRIC_SPINE_POS) {
        for (const lp of FABRIC_LEAF_POS) {
          const a = new Vector3(...sp);
          const b = new Vector3(...lp);
          const mid = new Vector3(
            (a.x + b.x) / 2,
            Math.max(a.y, b.y) + 0.4,
            (a.z + b.z) / 2,
          );
          out.push(new CatmullRomCurve3([a, mid, b]));
        }
      }
    }
    return out;
  }, [id]);

  const totalParticles = curves.length * PARTICLES_PER_CURVE;

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh || curves.length === 0) return;
    const trigger = useAppStore.getState().activeAnims[id];
    if (trigger && trigger.nonce !== lastNonceRef.current) {
      lastNonceRef.current = trigger.nonce;
      startTimeRef.current = state.clock.elapsedTime;
    }
    const ambient = 0.2;
    const burstWindow = 6;
    let intensity = ambient;
    if (startTimeRef.current !== null) {
      const t = state.clock.elapsedTime - startTimeRef.current;
      if (t < burstWindow) {
        intensity = 1 - (t / burstWindow) * (1 - ambient);
      } else {
        startTimeRef.current = null;
      }
    }
    const baseSpeed = id === "nvlinkPackets" ? 1.4 : 0.7;
    const speed = baseSpeed * (0.5 + intensity * 0.8);
    const time = state.clock.elapsedTime * speed;

    const mat = mesh.material as MeshStandardMaterial;
    const opacityCap = id === "fabricPackets" ? 0.72 : 1;
    mat.opacity = (0.15 + 0.85 * intensity) * opacityCap;

    let idx = 0;
    for (let c = 0; c < curves.length; c++) {
      const curve = curves[c];
      const dirSign = c % 2 === 0 ? 1 : -1;
      for (let p = 0; p < PARTICLES_PER_CURVE; p++) {
        const offset = p / PARTICLES_PER_CURVE;
        let u = (offset + time * dirSign) % 1;
        if (u < 0) u += 1;
        const pt = curve.getPointAt(u);
        dummy.position.copy(pt);
        dummy.scale.setScalar(
          (id === "nvlinkPackets" ? 0.024 : 0.05) +
            0.02 * intensity,
        );
        dummy.updateMatrix();
        mesh.setMatrixAt(idx++, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (totalParticles === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, totalParticles]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={id === "fabricPackets" ? 1.35 : 2.0}
        toneMapped={false}
        transparent
        opacity={id === "fabricPackets" ? 0.35 : 0.4}
        depthWrite={false}
        depthTest
      />
    </instancedMesh>
  );
}
