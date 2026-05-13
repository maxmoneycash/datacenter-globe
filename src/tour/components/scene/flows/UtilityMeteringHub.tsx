"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import type { Mesh } from "three";
import { palette } from "@tour/lib/palette";
import { UTILITY_METERING_HUB_WORLD } from "@tour/lib/cloudFlowAnchors";

/**
 * Gantry-ish splice where both outbound gold metering arcs share a waypoint toward
 * the utility yard — matches site-overview read of “roof streams → converge over power apron”.
 */
export function UtilityMeteringHub() {
  const ringRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (ringRef.current) ringRef.current.rotation.y = clock.elapsedTime * 0.52;
  });

  const { x, y, z } = UTILITY_METERING_HUB_WORLD;

  return (
    <group position={[x, y, z]} name="utility-metering-hub">
      <mesh castShadow receiveShadow position={[0, -0.18, 0]}>
        <boxGeometry args={[2.2, 0.52, 2.05]} />
        <meshStandardMaterial color="#343c48" roughness={0.8} metalness={0.18} />
        <Edges threshold={32} color={palette.shell} />
      </mesh>
      <mesh ref={ringRef} rotation-x={Math.PI / 2} position={[0, 0.38, 0]}>
        <torusGeometry args={[1.42, 0.022, 10, 48]} />
        <meshStandardMaterial
          color={palette.verify}
          emissive={palette.verify}
          emissiveIntensity={0.85}
          toneMapped={false}
          transparent
          opacity={0.88}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <sphereGeometry args={[0.1, 10, 10]} />
        <meshStandardMaterial
          color={palette.verify}
          emissive={palette.verify}
          emissiveIntensity={1.05}
          toneMapped={false}
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
