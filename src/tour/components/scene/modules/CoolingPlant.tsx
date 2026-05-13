"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { palette } from "@tour/lib/palette";

export function CoolingPlant() {
  return (
    <group position={[22, 0, 6]}>
      <mesh position={[0, 0.05, -2]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[12, 22]} />
        <meshStandardMaterial color="#1a1f27" roughness={1} />
      </mesh>

      <CoolingTower position={[-3.5, 0, -7]} />
      <CoolingTower position={[0, 0, -7]} />
      <CoolingTower position={[3.5, 0, -7]} />

      <CDU position={[0, 0, 0]} />

      <CoolantPipes />
    </group>
  );
}

function CoolingTower({ position }: { position: [number, number, number] }) {
  const fan = useRef<Group>(null);
  useFrame((_, dt) => {
    if (fan.current) fan.current.rotation.y += dt * 5.5;
  });
  return (
    <group position={position}>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.6, 3, 2.6]} />
        <meshStandardMaterial color="#3a414b" roughness={0.85} />
      </mesh>
      <mesh position={[0, 3.05, 0]}>
        <boxGeometry args={[2.7, 0.1, 2.7]} />
        <meshStandardMaterial color={palette.cooling} emissive={palette.cooling} emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, 3.2, 0]}>
        <cylinderGeometry args={[1.15, 1.15, 0.2, 24]} />
        <meshStandardMaterial color="#0f1318" />
      </mesh>
      <group ref={fan} position={[0, 3.32, 0]}>
        {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((r) => (
          <group key={r} rotation-y={r}>
            <mesh position={[0, 0, 0.5]}>
              <boxGeometry args={[0.18, 0.04, 0.9]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.5} />
            </mesh>
          </group>
        ))}
        <mesh>
          <cylinderGeometry args={[0.18, 0.18, 0.1, 16]} />
          <meshStandardMaterial color="#0a0d12" />
        </mesh>
      </group>
      <mesh position={[1.45, 1.4, 0]}>
        <boxGeometry args={[0.05, 1.8, 1.4]} />
        <meshStandardMaterial color={palette.cooling} emissive={palette.cooling} emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
}

function CDU({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[10, 2.4, 4]} />
        <meshStandardMaterial color="#2a313b" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.42, 0]}>
        <boxGeometry args={[10.1, 0.06, 4.1]} />
        <meshStandardMaterial color={palette.cooling} emissive={palette.cooling} emissiveIntensity={0.4} />
      </mesh>
      {[-3.5, 0, 3.5].map((x) => (
        <mesh key={x} position={[x, 1.2, 1.85]}>
          <boxGeometry args={[2.4, 1.4, 0.16]} />
          <meshStandardMaterial color={palette.cooling} emissive={palette.cooling} emissiveIntensity={0.25} roughness={0.5} />
        </mesh>
      ))}

      <mesh position={[-4.6, 1.2, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 2.4, 16]} />
        <meshStandardMaterial color={palette.cooling} emissive={palette.cooling} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[4.6, 1.2, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 2.4, 16]} />
        <meshStandardMaterial color="#fb923c" emissive="#fb923c" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function CoolantPipes() {
  return (
    <group>
      <mesh position={[-11, 1.4, -7]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.18, 0.18, 10, 16]} />
        <meshStandardMaterial
          color={palette.cooling}
          emissive={palette.cooling}
          emissiveIntensity={0.3}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-11, 0.7, -7]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.18, 0.18, 10, 16]} />
        <meshStandardMaterial
          color="#fb923c"
          emissive="#fb923c"
          emissiveIntensity={0.3}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[-6, 1.05, -7]}>
        <boxGeometry args={[0.6, 1.6, 0.6]} />
        <meshStandardMaterial color="#3a414b" roughness={0.85} />
      </mesh>
      <mesh position={[-16, 1.05, -7]}>
        <boxGeometry args={[0.6, 1.6, 0.6]} />
        <meshStandardMaterial color="#3a414b" roughness={0.85} />
      </mesh>
    </group>
  );
}
