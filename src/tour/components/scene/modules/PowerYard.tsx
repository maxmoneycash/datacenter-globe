"use client";

import { palette } from "@tour/lib/palette";

export function PowerYard() {
  return (
    <group position={[-22, 0, 8]}>
      <mesh position={[0, 0.05, -2]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[12, 22]} />
        <meshStandardMaterial color="#1a1f27" roughness={1} />
      </mesh>

      <Substation position={[0, 0, -8]} />

      <Generator position={[-3.5, 0, 0]} />
      <Generator position={[0, 0, 0]} />
      <Generator position={[3.5, 0, 0]} />

      <FuelTank position={[-3.5, 0, 5.5]} />
      <FuelTank position={[3.5, 0, 5.5]} />

      <UpsRoom position={[0, 0, 6]} />
    </group>
  );
}

function Substation({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[10, 1.2, 5]} />
        <meshStandardMaterial color="#2a313b" roughness={0.9} />
      </mesh>
      {[-3.4, -1.2, 1.2, 3.4].map((x) => (
        <group key={x} position={[x, 1.2, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.6, 1.4, 1.6]} />
            <meshStandardMaterial color={palette.power} roughness={0.55} metalness={0.3} />
          </mesh>
          <mesh position={[0, 1.0, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 0.6, 8]} />
            <meshStandardMaterial color="#1d232a" />
          </mesh>
          <mesh position={[0.45, 1.6, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.7, 8]} />
            <meshStandardMaterial color="#cdd5df" />
          </mesh>
          <mesh position={[-0.45, 1.6, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.7, 8]} />
            <meshStandardMaterial color="#cdd5df" />
          </mesh>
        </group>
      ))}
      {[-4, 4].map((x) => (
        <mesh key={x} position={[x, 3.5, -1.5]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 7, 8]} />
          <meshStandardMaterial color="#cdd5df" />
        </mesh>
      ))}
    </group>
  );
}

function Generator({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 2.4, 4]} />
        <meshStandardMaterial color="#3a414b" roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.4, 0]}>
        <boxGeometry args={[2.6, 0.08, 4.2]} />
        <meshStandardMaterial color={palette.power} emissive={palette.power} emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0.6, 3.0, -1.2]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 1.2, 12]} />
        <meshStandardMaterial color="#1a1f27" />
      </mesh>
      <mesh position={[-0.6, 3.0, -1.2]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 1.2, 12]} />
        <meshStandardMaterial color="#1a1f27" />
      </mesh>
      <mesh position={[0, 0.3, 1.6]}>
        <boxGeometry args={[1.4, 0.3, 0.6]} />
        <meshStandardMaterial color="#2a313b" />
      </mesh>
    </group>
  );
}

function FuelTank({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]} rotation-z={Math.PI / 2} castShadow>
        <cylinderGeometry args={[1.0, 1.0, 2.6, 24]} />
        <meshStandardMaterial color="#454c57" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 1, 1.31]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[1.0, 1.0, 0.04, 24, 1, true]} />
        <meshStandardMaterial color={palette.power} emissive={palette.power} emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

function UpsRoom({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[10, 2.4, 4]} />
        <meshStandardMaterial color="#2a313b" roughness={0.9} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[-4.4 + i * 1.2, 1.2, 1.85]}>
          <boxGeometry args={[0.9, 1.6, 0.18]} />
          <meshStandardMaterial color={palette.power} emissive={palette.power} emissiveIntensity={0.35} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 2.45, 0]}>
        <boxGeometry args={[10.1, 0.1, 4.1]} />
        <meshStandardMaterial color="#1a1f27" />
      </mesh>
    </group>
  );
}
