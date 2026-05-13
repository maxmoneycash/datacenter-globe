import { Vector3 } from "three";

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

const _v = new Vector3();

export function lerpVec3(
  out: Vector3,
  from: [number, number, number] | Vector3,
  to: [number, number, number] | Vector3,
  t: number,
) {
  if (Array.isArray(from)) {
    out.set(from[0], from[1], from[2]);
  } else {
    out.copy(from);
  }
  if (Array.isArray(to)) {
    _v.set(to[0], to[1], to[2]);
  } else {
    _v.copy(to);
  }
  out.lerp(_v, t);
  return out;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
