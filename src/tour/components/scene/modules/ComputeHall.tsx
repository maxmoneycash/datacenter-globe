"use client";

import { useMemo } from "react";
import { Instances, Instance } from "@react-three/drei";
import { palette } from "@tour/lib/palette";
import {
  HALL_BASE_Z,
  HALL_PER_ROW,
  HALL_RACK_D,
  HALL_RACK_H,
  HALL_RACK_W,
  HALL_RACK_X_GAP,
  HALL_ROW_PITCH,
  HALL_ROWS,
} from "@tour/lib/computeHallGrid";

const ROWS = HALL_ROWS;
const PER_ROW = HALL_PER_ROW;
const RACK_W = HALL_RACK_W;
const RACK_D = HALL_RACK_D;
const RACK_H = HALL_RACK_H;
const RACK_X_GAP = HALL_RACK_X_GAP;
const ROW_PITCH = HALL_ROW_PITCH;

export function ComputeHall() {
  const positions = useMemo(() => {
    const out: { pos: [number, number, number]; faceFront: boolean }[] = [];
    const rowZ = (rowIndex: number) => {
      return HALL_BASE_Z + rowIndex * ROW_PITCH;
    };
    const rowStartX = -((PER_ROW * RACK_W + (PER_ROW - 1) * RACK_X_GAP) / 2);
    for (let r = 0; r < ROWS; r++) {
      const z = rowZ(r);
      const isHot = r === 1 || r === 2;
      for (let c = 0; c < PER_ROW; c++) {
        const x = rowStartX + c * (RACK_W + RACK_X_GAP);
        out.push({
          pos: [x, RACK_H / 2, z],
          faceFront: !isHot,
        });
      }
    }
    return out;
  }, []);

  return (
    <group>
      <mesh position={[0, 0.06, -8]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[24, 12]} />
        <meshStandardMaterial color={palette.floor} roughness={1} />
      </mesh>

      {Array.from({ length: 24 }).map((_, i) => (
        <mesh
          key={`tile-${i}`}
          position={[-11.5 + (i % 12) * 2, 0.07, -11.5 + Math.floor(i / 12) * 1.4]}
          rotation-x={-Math.PI / 2}
        >
          <planeGeometry args={[1.6, 1.0]} />
          <meshStandardMaterial color="#1f2630" roughness={1} />
        </mesh>
      ))}

      <Instances limit={ROWS * PER_ROW} castShadow receiveShadow>
        <boxGeometry args={[RACK_W, RACK_H, RACK_D]} />
        <meshStandardMaterial color="#1d232b" roughness={0.7} metalness={0.2} />
        {positions.map((p, i) => (
          <Instance key={i} position={p.pos} />
        ))}
      </Instances>

      <Instances limit={ROWS * PER_ROW * 18} castShadow={false}>
        <boxGeometry args={[RACK_W * 0.86, 0.06, 0.02]} />
        <meshStandardMaterial color={palette.compute} emissive={palette.compute} emissiveIntensity={0.5} />
        {positions.flatMap((p, i) =>
          Array.from({ length: 18 }).map((_, k) => (
            <Instance
              key={`led-${i}-${k}`}
              position={[
                p.pos[0],
                0.3 + k * 0.1,
                p.pos[2] + (p.faceFront ? RACK_D / 2 + 0.011 : -RACK_D / 2 - 0.011),
              ]}
            />
          )),
        )}
      </Instances>

      <CableTrayOverhead />
    </group>
  );
}

function CableTrayOverhead() {
  const trays: number[] = [];
  for (let r = 0; r < ROWS - 1; r++) {
    trays.push(-12 + r * ROW_PITCH + ROW_PITCH / 2);
  }
  return (
    <group position={[0, 4.6, 0]}>
      {trays.map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh>
            <boxGeometry args={[12, 0.08, 0.6]} />
            <meshStandardMaterial color="#3a4250" roughness={0.85} />
          </mesh>
          <mesh position={[0, -0.18, 0]}>
            <boxGeometry args={[12, 0.04, 0.55]} />
            <meshStandardMaterial color={palette.fabric} emissive={palette.fabric} emissiveIntensity={0.25} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 0.45, -8]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.09, 0.09, 11, 16]} />
        <meshStandardMaterial
          color={palette.cooling}
          emissive={palette.cooling}
          emissiveIntensity={0.3}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.45, -8.3]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.09, 0.09, 11, 16]} />
        <meshStandardMaterial
          color="#fb923c"
          emissive="#fb923c"
          emissiveIntensity={0.3}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
