"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CatmullRomCurve3,
  Color,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from "three";
import { palette } from "@tour/lib/palette";
import { useAppStore } from "@tour/lib/store";

const PARTICLES = 80;

export function CoolantFlow() {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const tmpColor = useMemo(() => new Color(), []);
  const startTimeRef = useRef<number | null>(null);
  const lastNonceRef = useRef(0);

  const curve = useMemo(() => {
    return new CatmullRomCurve3(
      [
        new Vector3(7, 1.0, -1),
        new Vector3(2, 1.0, -1),
        new Vector3(0.4, 1.0, -2.6),
        new Vector3(0.4, 3.4, -2.6),
        new Vector3(0.4, 3.4, -1.5),
        new Vector3(0.4, 1.0, -1.5),
        new Vector3(2, 1.0, 1),
        new Vector3(7, 1.0, 1),
        new Vector3(15, 1.0, -1),
        new Vector3(22, 1.2, -1),
        new Vector3(22, 3.0, -1),
        new Vector3(22, 3.0, 1),
        new Vector3(22, 1.2, 1),
        new Vector3(15, 1.0, 1),
        new Vector3(7, 1.0, 1),
      ],
      true,
    );
  }, []);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const trigger = useAppStore.getState().activeAnims.coolantFlow;
    if (trigger && trigger.nonce !== lastNonceRef.current) {
      lastNonceRef.current = trigger.nonce;
      startTimeRef.current = state.clock.elapsedTime;
    }
    const ambient = 0.35;
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
    const speed = 0.12 * (0.6 + intensity * 0.7);
    const t = state.clock.elapsedTime * speed;
    const mat = mesh.material as MeshStandardMaterial;
    mat.opacity = 0.25 + 0.65 * intensity;

    for (let i = 0; i < PARTICLES; i++) {
      const u = (i / PARTICLES + t) % 1;
      const p = curve.getPointAt(u);
      dummy.position.copy(p);
      dummy.scale.setScalar(0.05 + 0.04 * intensity);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      const heat = u > 0.18 && u < 0.42 ? Math.min(1, (u - 0.18) / 0.12) : 0;
      tmpColor.set(palette.cooling).lerp(new Color(palette.compute), Math.min(1, heat));
      mesh.setColorAt(i, tmpColor);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLES]}>
      <sphereGeometry args={[1, 10, 10]} />
      <meshStandardMaterial
        color={palette.cooling}
        emissive={palette.cooling}
        emissiveIntensity={1.4}
        toneMapped={false}
        transparent
        opacity={0.6}
        depthWrite={false}
      />
    </instancedMesh>
  );
}
