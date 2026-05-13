"use client";

import { Edges } from "@react-three/drei";
import { palette } from "@tour/lib/palette";

/**
 * Extra physical detail for “what is this thing?” reads — **mesh only**, no HUD text.
 * Covers metering yard hardware, fiber entry, and one interior bus run so the scene
 * doesn’t read as hollow shells only.
 */
export function CoreSiteHardware() {
  return (
    <group name="core-site-hardware">
      {/* Revenue-grade metering structure at the serve path (not an empty slab). */}
      <group position={[-17.5, 0, 5.2]}>
        <mesh position={[0, 2.4, 0]} castShadow>
          <boxGeometry args={[0.16, 4.9, 0.16]} />
          <meshStandardMaterial color="#3a4452" roughness={0.75} metalness={0.2} />
        </mesh>
        <mesh position={[0.55, 2.4, 0]} castShadow>
          <boxGeometry args={[0.16, 4.9, 0.16]} />
          <meshStandardMaterial color="#3a4452" roughness={0.75} metalness={0.2} />
        </mesh>
        <mesh position={[0.28, 4.65, 0]} rotation-z={Math.PI / 2}>
          <boxGeometry args={[1.35, 0.08, 0.08]} />
          <meshStandardMaterial color="#4a5568" roughness={0.65} />
        </mesh>
        {[-0.35, 0, 0.35].map((x) => (
          <mesh key={x} position={[0.28 + x, 4.65, 0]}>
            <cylinderGeometry args={[0.08, 0.1, 0.55, 12]} />
            <meshStandardMaterial color="#aeb6c2" roughness={0.35} metalness={0.25} />
          </mesh>
        ))}
      </group>

      {/* Outdoor fiber & control handhole — east approach to storage. */}
      <group position={[10.5, 0.05, -5.5]}>
        <mesh receiveShadow castShadow position={[0, 0.35, 0]}>
          <boxGeometry args={[1.05, 0.7, 0.85]} />
          <meshStandardMaterial color="#2b3340" roughness={0.88} metalness={0.1} />
          <Edges threshold={40} color={palette.fabric} />
        </mesh>
        <mesh position={[0, 0.76, 0.32]}>
          <boxGeometry args={[0.45, 0.12, 0.08]} />
          <meshStandardMaterial
            color={palette.fabric}
            emissive={palette.fabric}
            emissiveIntensity={0.35}
          />
        </mesh>
      </group>

      {/* Raised-floor feed — busduct run toward the liquid rack (reads as installed kit). */}
      <group position={[0, 0.12, -1.2]}>
        <mesh position={[-1.8, 0.08, 0]} castShadow>
          <boxGeometry args={[4.8, 0.12, 0.42]} />
          <meshStandardMaterial color="#3d4756" roughness={0.55} metalness={0.45} />
        </mesh>
        <mesh position={[-1.8, 0.22, 0]}>
          <boxGeometry args={[4.7, 0.04, 0.28]} />
          <meshStandardMaterial
            color={palette.power}
            emissive={palette.power}
            emissiveIntensity={0.08}
          />
        </mesh>
      </group>
    </group>
  );
}
