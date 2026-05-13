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

const BURST_PARTICLES = 28;
const AMBIENT_PARTICLES = 32;

function useMainFeedCurve() {
  return useMemo(
    () =>
      new CatmullRomCurve3(
        [
          new Vector3(-22, 1.8, 0),
          new Vector3(-22, 2.4, 3.5),
          new Vector3(-22, 2.4, 6),
          new Vector3(-18, 2.0, 6),
          new Vector3(-12, 1.4, 4),
          new Vector3(-6, 0.6, 0),
          new Vector3(0, 0.4, -2),
        ],
        false,
      ),
    [],
  );
}

/** One-shot surge when the power module tour animation fires. */
export function PowerPulse() {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const startTimeRef = useRef<number | null>(null);
  const lastNonceRef = useRef(0);
  const curve = useMainFeedCurve();

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const trigger = useAppStore.getState().activeAnims.powerPulse;
    if (trigger && trigger.nonce !== lastNonceRef.current) {
      lastNonceRef.current = trigger.nonce;
      startTimeRef.current = state.clock.elapsedTime;
    }
    const window = 2.4;
    const mat = mesh.material as MeshStandardMaterial;
    if (startTimeRef.current === null) {
      mat.opacity = 0;
      mesh.visible = false;
      return;
    }
    mesh.visible = true;
    const t = state.clock.elapsedTime - startTimeRef.current;
    if (t > window) {
      startTimeRef.current = null;
      mat.opacity = 0;
      return;
    }
    const head = t / window;
    const tail = Math.max(0, head - 0.18);
    mat.opacity = 1 - Math.max(0, head - 0.85) / 0.15;

    for (let i = 0; i < BURST_PARTICLES; i++) {
      const u = tail + (head - tail) * (i / (BURST_PARTICLES - 1));
      const cu = Math.max(0, Math.min(1, u));
      const p = curve.getPointAt(cu);
      dummy.position.copy(p);
      const fade = Math.sin(Math.PI * (i / (BURST_PARTICLES - 1)));
      dummy.scale.setScalar(0.06 + 0.05 * fade);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, BURST_PARTICLES]}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshStandardMaterial
        color={palette.power}
        emissive={palette.power}
        emissiveIntensity={2.4}
        toneMapped={false}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

/** Continuous low-intensity march along the same feed — reads as “utility always on”. */
export function PowerFeedAmbient() {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const curve = useMainFeedCurve();

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const flow = clock.elapsedTime * 0.085;
    const mat = mesh.material as MeshStandardMaterial;
    mat.opacity =
      0.11 + 0.04 * Math.sin(clock.elapsedTime * 0.35);

    for (let i = 0; i < AMBIENT_PARTICLES; i++) {
      const u = (i / AMBIENT_PARTICLES + flow) % 1;
      const p = curve.getPointAt(u);
      dummy.position.copy(p);
      const wave = 0.85 + 0.15 * Math.sin(clock.elapsedTime * 1.8 + i * 0.35);
      dummy.scale.setScalar((0.028 + 0.018 * wave) * 1.1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, AMBIENT_PARTICLES]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial
        color={palette.power}
        emissive={palette.power}
        emissiveIntensity={1.15}
        toneMapped={false}
        transparent
        opacity={0.12}
        depthWrite={false}
      />
    </instancedMesh>
  );
}
