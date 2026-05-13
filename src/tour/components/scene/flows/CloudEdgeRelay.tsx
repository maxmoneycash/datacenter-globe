"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";
import { palette } from "@tour/lib/palette";
import { CLOUD_EDGE_RELAY_WORLD } from "@tour/lib/cloudFlowAnchors";

/**
 * Rooftop metering egress — oversized for **orbit / site-intro** readability:
 * curves land on the pad underneath; ring + beacon read as converged traffic.
 */
export function CloudEdgeRelay() {
  const ringRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = clock.elapsedTime * 0.65;
      ringRef.current.rotation.x =
        Math.PI / 2 + Math.sin(clock.elapsedTime * 0.4) * 0.06;
    }
    if (glowRef.current) {
      const m = glowRef.current.material as MeshStandardMaterial;
      m.emissiveIntensity = 1.45 + Math.sin(clock.elapsedTime * 2.2) * 0.32;
    }
  });

  const { x, y, z } = CLOUD_EDGE_RELAY_WORLD;

  return (
    <group position={[x, y, z]} name="cloud-edge-relay">
      <mesh castShadow receiveShadow position={[0, -0.16, 0]}>
        <cylinderGeometry args={[0.55, 0.62, 0.5, 24]} />
        <meshStandardMaterial
          color="#1d242e"
          roughness={0.36}
          metalness={0.58}
        />
        <Edges threshold={42} color={palette.shell} />
      </mesh>
      <mesh ref={ringRef} position={[0, 0.72, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[1.15, 0.036, 12, 64]} />
        <meshStandardMaterial
          color={palette.verify}
          emissive={palette.verify}
          emissiveIntensity={1.35}
          toneMapped={false}
          transparent
          opacity={0.94}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, 0.66, 0]}>
        <torusGeometry args={[0.92, 0.012, 8, 48]} />
        <meshStandardMaterial
          color={palette.verify}
          emissive={palette.verify}
          emissiveIntensity={0.55}
          toneMapped={false}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={glowRef} position={[0, 0.72, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial
          color={palette.verify}
          emissive={palette.verify}
          emissiveIntensity={1.6}
          toneMapped={false}
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
