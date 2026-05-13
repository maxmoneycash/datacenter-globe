"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { palette } from "@tour/lib/palette";
import { useAppStore } from "@tour/lib/store";
import { getTargetExplode, getTargetNodeSlide } from "@tour/lib/derived";
import { lerp } from "@tour/lib/camera";
import { ComputeNode } from "./ComputeNode";

const TRAY_COUNT = 27;
const TRAY_HEIGHT = 0.11;
const TRAY_GAP = 0.01;
const RACK_WIDTH = 1.0;
const RACK_DEPTH = 1.4;
const NODE_SLOT_INDEX = 22;

export function RackNVL72({
  position = [0, 0, -2],
}: {
  position?: [number, number, number];
}) {
  const group = useRef<Group>(null);
  const explodeRef = useRef(0);
  const slideRef = useRef(0);
  const traysRef = useRef<Group>(null);

  useFrame(() => {
    const s = useAppStore.getState();
    const targetExplode = getTargetExplode(s);
    const targetSlide = getTargetNodeSlide(s);

    explodeRef.current = lerp(explodeRef.current, targetExplode, 0.06);
    slideRef.current = lerp(slideRef.current, targetSlide, 0.06);

    if (traysRef.current) {
      const baseGap = TRAY_HEIGHT + TRAY_GAP;
      const expandedGap = baseGap + 0.06 * explodeRef.current;
      const totalH = TRAY_COUNT * expandedGap;
      const startY = 0.32 - totalH / 2 + expandedGap / 2 + TRAY_COUNT * baseGap / 2;
      traysRef.current.children.forEach((child, i) => {
        const y = 0.36 + i * expandedGap;
        child.position.y = y;
        if (i === NODE_SLOT_INDEX) {
          child.position.z = slideRef.current * 0.8;
        } else {
          child.position.z = 0;
        }
      });
      void startY;
    }
  });

  return (
    <group ref={group} position={position}>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
        <boxGeometry args={[RACK_WIDTH + 0.06, 0.36, RACK_DEPTH + 0.06]} />
        <meshStandardMaterial color="#1a1f27" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.08, RACK_DEPTH / 2 - 0.02]}>
        <boxGeometry args={[0.6, 0.08, 0.06]} />
        <meshStandardMaterial color={palette.power} emissive={palette.power} emissiveIntensity={0.4} />
      </mesh>

      {[
        [-RACK_WIDTH / 2 - 0.02, RACK_DEPTH / 2 + 0.02],
        [RACK_WIDTH / 2 + 0.02, RACK_DEPTH / 2 + 0.02],
        [-RACK_WIDTH / 2 - 0.02, -RACK_DEPTH / 2 - 0.02],
        [RACK_WIDTH / 2 + 0.02, -RACK_DEPTH / 2 - 0.02],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 1.8, z]} castShadow>
          <boxGeometry args={[0.06, 3.6, 0.06]} />
          <meshStandardMaterial color="#0e1218" />
        </mesh>
      ))}

      <mesh position={[0, 3.55, -RACK_DEPTH / 2 + 0.05]}>
        <boxGeometry args={[RACK_WIDTH + 0.04, 0.1, 0.18]} />
        <meshStandardMaterial color="#0f1318" />
      </mesh>
      <mesh position={[-RACK_WIDTH / 2 + 0.18, 1.8, -RACK_DEPTH / 2 + 0.07]}>
        <cylinderGeometry args={[0.06, 0.06, 3.2, 16]} />
        <meshStandardMaterial
          color={palette.cooling}
          emissive={palette.cooling}
          emissiveIntensity={0.35}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[RACK_WIDTH / 2 - 0.18, 1.8, -RACK_DEPTH / 2 + 0.07]}>
        <cylinderGeometry args={[0.06, 0.06, 3.2, 16]} />
        <meshStandardMaterial
          color="#fb923c"
          emissive="#fb923c"
          emissiveIntensity={0.35}
          toneMapped={false}
        />
      </mesh>

      <mesh position={[0, 1.8, -RACK_DEPTH / 2 + 0.04]}>
        <boxGeometry args={[RACK_WIDTH - 0.42, 3.0, 0.02]} />
        <meshStandardMaterial
          color={palette.nvlink}
          emissive={palette.nvlink}
          emissiveIntensity={0.25}
          roughness={0.55}
          metalness={0.2}
        />
      </mesh>

      <group ref={traysRef}>
        {Array.from({ length: TRAY_COUNT }).map((_, i) => {
          const isSwitch = i % 3 === 2;
          const isNodeSlot = i === NODE_SLOT_INDEX;
          if (isNodeSlot) {
            return (
              <group key={i}>
                <ComputeNode />
              </group>
            );
          }
          return (
            <group key={i}>
              <Tray switchTray={isSwitch} />
            </group>
          );
        })}
      </group>
    </group>
  );
}

function Tray({ switchTray }: { switchTray: boolean }) {
  const color = switchTray ? palette.nvlink : palette.compute;
  const trayFrontZ = (RACK_DEPTH - 0.04) / 2;
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[RACK_WIDTH - 0.04, TRAY_HEIGHT, RACK_DEPTH - 0.04]} />
        <meshStandardMaterial color="#0f1318" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0.08, 0, trayFrontZ + 0.006]}>
        <boxGeometry args={[RACK_WIDTH - 0.32, TRAY_HEIGHT - 0.02, 0.008]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={switchTray ? 0.55 : 0.4}
          roughness={0.5}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-RACK_WIDTH / 2 + 0.08, 0, trayFrontZ + 0.006]}>
        <boxGeometry args={[0.05, 0.04, 0.008]} />
        <meshStandardMaterial
          color={palette.fabric}
          emissive={palette.fabric}
          emissiveIntensity={0.7}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-RACK_WIDTH / 2 + 0.15, 0, trayFrontZ + 0.006]}>
        <boxGeometry args={[0.05, 0.04, 0.008]} />
        <meshStandardMaterial
          color={palette.power}
          emissive={palette.power}
          emissiveIntensity={0.7}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
