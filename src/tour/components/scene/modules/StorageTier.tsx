"use client";

import { palette } from "@tour/lib/palette";

export function StorageTier() {
  return (
    <group position={[14, 0, -8]}>
      <mesh position={[0, 0.07, 0]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[6, 8]} />
        <meshStandardMaterial color="#1b212a" roughness={1} />
      </mesh>

      {Array.from({ length: 6 }).map((_, i) => (
        <StorageRack key={i} position={[-2.2 + (i % 3) * 2.2, 0, -1.6 + Math.floor(i / 3) * 3]} />
      ))}
    </group>
  );
}

function StorageRack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 2.1, 1.2]} />
        <meshStandardMaterial color="#161b22" roughness={0.7} metalness={0.2} />
      </mesh>
      {Array.from({ length: 12 }).map((_, i) => (
        <group key={i}>
          <mesh position={[0, 0.18 + i * 0.16, 0.605]}>
            <boxGeometry args={[0.84, 0.12, 0.01]} />
            <meshStandardMaterial color={palette.storage} emissive={palette.storage} emissiveIntensity={0.35} roughness={0.5} />
          </mesh>
          <mesh position={[-0.36, 0.18 + i * 0.16, 0.612]}>
            <boxGeometry args={[0.05, 0.04, 0.005]} />
            <meshStandardMaterial color={palette.fabric} emissive={palette.fabric} emissiveIntensity={0.7} />
          </mesh>
          <mesh position={[-0.28, 0.18 + i * 0.16, 0.612]}>
            <boxGeometry args={[0.05, 0.04, 0.005]} />
            <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
