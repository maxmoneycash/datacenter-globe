"use client";

import { useMemo, useRef } from "react";
import { palette } from "@tour/lib/palette";
import { useAppStore } from "@tour/lib/store";
import { useFrame } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial, Material } from "three";

const GROUND = 100;
const SHELL_X = 32;
const SHELL_Z = 20;
const SHELL_Y = 7;
const SHELL_CENTER: [number, number, number] = [2, SHELL_Y / 2, -4];

export function SiteShell() {
  const tourStep = useAppStore((s) => s.tourStep);
  const mode = useAppStore((s) => s.mode);
  const focused = useAppStore((s) => s.focusedModuleId);

  const fenceLines = useMemo(() => {
    const w = 44;
    const d = 36;
    const x0 = -w / 2 + 2;
    const x1 = w / 2 + 2;
    const z0 = -d / 2 - 2;
    const z1 = d / 2 + 4;
    const posts: [number, number][] = [];
    for (let x = x0; x <= x1; x += 4) {
      posts.push([x, z0]);
      posts.push([x, z1]);
    }
    for (let z = z0 + 4; z <= z1 - 4; z += 4) {
      posts.push([x0, z]);
      posts.push([x1, z]);
    }
    return posts;
  }, []);

  const shellRef = useRef<Mesh>(null);

  useFrame(() => {
    if (!shellRef.current) return;
    const siteIntro = mode === "tour" && tourStep === 0;
    const insideFocus =
      (mode === "tour" && tourStep >= 3 && tourStep <= 6) ||
      focused === "hall" ||
      focused === "rack" ||
      focused === "node" ||
      focused === "network" ||
      focused === "storage";
    const mat = shellRef.current.material as Material;
    const ghostInside = insideFocus ? 0.04 : siteIntro ? 0.175 : 0.13;
    const m = mat as MeshStandardMaterial;
    m.opacity += (ghostInside - m.opacity) * 0.08;
  });

  return (
    <group>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[GROUND, GROUND]} />
        <meshStandardMaterial color={palette.ground} roughness={1} metalness={0} />
      </mesh>

      <mesh rotation-x={-Math.PI / 2} position={[2, 0.005, -4]}>
        <planeGeometry args={[SHELL_X + 2, SHELL_Z + 4]} />
        <meshStandardMaterial color="#11151b" roughness={1} />
      </mesh>

      <mesh
        ref={shellRef}
        position={SHELL_CENTER}
      >
        <boxGeometry args={[SHELL_X, SHELL_Y, SHELL_Z]} />
        <meshStandardMaterial
          color={palette.shellDark}
          transparent
          opacity={0.13}
          roughness={0.85}
          metalness={0.05}
          depthWrite={false}
        />
        <Edges threshold={1} color={palette.shell} />
      </mesh>

      <mesh position={[2, SHELL_Y, -4 + SHELL_Z / 2 - 0.05]}>
        <boxGeometry args={[SHELL_X, 0.04, 0.1]} />
        <meshStandardMaterial color={palette.compute} emissive={palette.compute} emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[2, SHELL_Y, -4 - SHELL_Z / 2 + 0.05]}>
        <boxGeometry args={[SHELL_X, 0.04, 0.1]} />
        <meshStandardMaterial color={palette.compute} emissive={palette.compute} emissiveIntensity={0.4} />
      </mesh>

      {fenceLines.map(([x, z], i) => (
        <mesh key={i} position={[x, 0.9, z]}>
          <boxGeometry args={[0.05, 1.8, 0.05]} />
          <meshStandardMaterial color="#3b424c" />
        </mesh>
      ))}

      <mesh position={[0, 0.02, 24]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[10, 18]} />
        <meshStandardMaterial color="#0d1117" />
      </mesh>

      {[-1.6, 1.6].map((x) => (
        <mesh key={x} position={[x, 0.03, 24]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.12, 16]} />
          <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={0.2} />
        </mesh>
      ))}

      <mesh position={[2, 0.04, -4]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[Math.max(SHELL_X, SHELL_Z) / 2 + 0.5, Math.max(SHELL_X, SHELL_Z) / 2 + 0.65, 64]} />
        <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={0.15} transparent opacity={0.18} />
      </mesh>

      {/* Corner piers for readable massing from orbit */}
      {(
        [
          [-14.2, -13.9],
          [-14.2, 5.9],
          [18.2, -13.9],
          [18.2, 5.9],
        ] as const
      ).map(([x, z], i) => (
        <mesh key={`pier-${i}`} position={[x, SHELL_Y * 0.45, z]} castShadow>
          <boxGeometry args={[0.42, SHELL_Y * 0.95, 0.42]} />
          <meshStandardMaterial color="#2a3340" roughness={0.75} metalness={0.15} />
        </mesh>
      ))}
    </group>
  );
}
