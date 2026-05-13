"use client";

import { useMemo } from "react";
import { Tube } from "@react-three/drei";
import { CatmullRomCurve3, Vector3 } from "three";
import { palette } from "@tour/lib/palette";

const SPINE_COUNT = 4;
const LEAF_COUNT = 4;
const SPINE_Y = 6.4;
const LEAF_Y = 4.8;

const SPINE_POS: [number, number, number][] = Array.from(
  { length: SPINE_COUNT },
  (_, i) => [-3.6 + i * 2.4, SPINE_Y, -10] as [number, number, number],
);

const LEAF_POS: [number, number, number][] = Array.from(
  { length: LEAF_COUNT },
  (_, i) => [-9 + i * 6, LEAF_Y, -8.7] as [number, number, number],
);

export function NetworkFabric() {
  const links = useMemo(() => {
    const out: CatmullRomCurve3[] = [];
    for (const sp of SPINE_POS) {
      for (const lp of LEAF_POS) {
        const a = new Vector3(...sp);
        const b = new Vector3(...lp);
        const mid = new Vector3(
          (a.x + b.x) / 2,
          Math.max(a.y, b.y) + 0.4,
          (a.z + b.z) / 2,
        );
        out.push(new CatmullRomCurve3([a, mid, b]));
      }
    }
    return out;
  }, []);

  return (
    <group>
      {SPINE_POS.map((p, i) => (
        <Switch key={`s-${i}`} position={p} accent={palette.fabric} />
      ))}
      {LEAF_POS.map((p, i) => (
        <Switch key={`l-${i}`} position={p} accent={palette.fabric} small />
      ))}

      {links.map((curve, i) => (
        <Tube key={i} args={[curve, 24, 0.018, 6, false]}>
          <meshStandardMaterial
            color="#065f46"
            emissive={palette.fabric}
            emissiveIntensity={0.72}
            metalness={0.15}
            roughness={0.42}
            toneMapped
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        </Tube>
      ))}

      <mesh position={[0, SPINE_Y - 0.4, -10]}>
        <boxGeometry args={[12, 0.06, 1.4]} />
        <meshStandardMaterial color="#3a4250" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Switch({
  position,
  accent,
  small,
}: {
  position: [number, number, number];
  accent: string;
  small?: boolean;
}) {
  const w = small ? 1.4 : 1.8;
  const h = small ? 0.12 : 0.16;
  const d = small ? 0.7 : 0.9;
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#15191f" roughness={0.55} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0, d / 2 - 0.005]}>
        <boxGeometry args={[w - 0.12, h - 0.04, 0.01]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.45} />
      </mesh>
      {Array.from({ length: small ? 16 : 32 }).map((_, i) => (
        <mesh
          key={i}
          position={[
            -w / 2 + 0.08 + (i % 16) * (w - 0.16) / 15,
            -h / 2 + 0.014 + Math.floor(i / 16) * (h - 0.04),
            d / 2 + 0.005,
          ]}
        >
          <boxGeometry args={[0.012, 0.008, 0.004]} />
          <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

export const FABRIC_SPINE_POS = SPINE_POS;
export const FABRIC_LEAF_POS = LEAF_POS;
