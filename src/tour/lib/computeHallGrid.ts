import { Vector3 } from "three";

/** Mirrors `ComputeHall` — keep these constants in sync when editing the hall layout. */
export const HALL_ROWS = 4;
export const HALL_PER_ROW = 8;
export const HALL_RACK_W = 0.7;
export const HALL_RACK_D = 1.0;
export const HALL_RACK_H = 2.2;
export const HALL_RACK_X_GAP = 0.4;
export const HALL_ROW_PITCH = 2.6;
export const HALL_BASE_Z = -12;

export function hallRackCenter(row: number, col: number): Vector3 {
  const rowStartX =
    -(
      HALL_PER_ROW * HALL_RACK_W +
      (HALL_PER_ROW - 1) * HALL_RACK_X_GAP
    ) / 2;
  const x = rowStartX + col * (HALL_RACK_W + HALL_RACK_X_GAP);
  const z = HALL_BASE_Z + row * HALL_ROW_PITCH;
  return new Vector3(x, HALL_RACK_H / 2, z);
}

/** Slightly above racks — path for east–west “training traffic” between cabinets. */
export function hallRackFlowPort(row: number, col: number): Vector3 {
  return hallRackCenter(row, col).setY(3.35);
}
