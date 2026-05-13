"use client";

import { palette } from "@tour/lib/palette";

const TRAY_W = 0.96;
const TRAY_D = 1.36;
const TRAY_H = 0.11;

export const COMPUTE_NODE_GPU_OFFSETS: [number, number][] = [
  [-0.27, 0.1],
  [-0.09, 0.1],
  [0.09, 0.1],
  [0.27, 0.1],
];

export function ComputeNode() {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[TRAY_W, TRAY_H, TRAY_D]} />
        <meshStandardMaterial color="#10151c" roughness={0.55} metalness={0.45} />
      </mesh>

      <mesh position={[0, TRAY_H / 2 + 0.006, 0]}>
        <boxGeometry args={[TRAY_W - 0.04, 0.008, TRAY_D - 0.04]} />
        <meshStandardMaterial color="#1a212b" roughness={0.4} metalness={0.6} />
      </mesh>

      {[-0.3, 0.3].map((x) => (
        <group key={x} position={[x, TRAY_H / 2 + 0.005, -0.3]}>
          <mesh>
            <boxGeometry args={[0.18, 0.012, 0.18]} />
            <meshStandardMaterial color="#15191f" roughness={0.4} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0.012, 0]}>
            <boxGeometry args={[0.14, 0.014, 0.14]} />
            <meshStandardMaterial
              color={palette.cooling}
              emissive={palette.cooling}
              emissiveIntensity={0.3}
              roughness={0.4}
              metalness={0.6}
            />
          </mesh>
        </group>
      ))}

      {COMPUTE_NODE_GPU_OFFSETS.map(([x, z], i) => (
        <group key={i} position={[x, TRAY_H / 2 + 0.005, z]}>
          <mesh>
            <boxGeometry args={[0.16, 0.014, 0.32]} />
            <meshStandardMaterial color="#15191f" roughness={0.4} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0.018, 0]}>
            <boxGeometry args={[0.12, 0.018, 0.28]} />
            <meshStandardMaterial
              color={palette.compute}
              emissive={palette.compute}
              emissiveIntensity={0.4}
              roughness={0.4}
              metalness={0.6}
            />
          </mesh>
          <mesh position={[0, 0.03, 0]}>
            <boxGeometry args={[0.13, 0.005, 0.29]} />
            <meshStandardMaterial color={palette.cooling} emissive={palette.cooling} emissiveIntensity={0.5} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, TRAY_H / 2 + 0.005, TRAY_D / 2 - 0.06]}>
        <boxGeometry args={[TRAY_W - 0.06, 0.018, 0.04]} />
        <meshStandardMaterial color="#0d1117" />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh
          key={i}
          position={[
            -0.36 + i * 0.1,
            TRAY_H / 2 + 0.014,
            TRAY_D / 2 - 0.06,
          ]}
        >
          <boxGeometry args={[0.04, 0.012, 0.024]} />
          <meshStandardMaterial color={palette.fabric} emissive={palette.fabric} emissiveIntensity={0.6} />
        </mesh>
      ))}

      <mesh position={[0, TRAY_H / 2 + 0.005, -TRAY_D / 2 + 0.04]}>
        <boxGeometry args={[TRAY_W - 0.06, 0.014, 0.02]} />
        <meshStandardMaterial color={palette.nvlink} emissive={palette.nvlink} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}
