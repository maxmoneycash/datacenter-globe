import { Vector3 } from "three";
import { SITE_ROOF_DECK_Y, SITE_SHELL_BOX } from "@tour/lib/siteShellDimensions";

/** Roof-escape / edge metering mast — xz over main hall; no physical slab below (labels + mast only). */
const EDGE_RELAY_XZ = new Vector3(SITE_SHELL_BOX.center[0] + 0.35, 0, -3.82);

/**
 * World origin for {@link CloudEdgeRelay} + gold spline knot (`DataPathFlows`).
 * Mast base flush with roof deck (cylinder geometry offset inside component).
 */
export const CLOUD_EDGE_RELAY_WORLD = new Vector3(
  EDGE_RELAY_XZ.x,
  SITE_ROOF_DECK_Y + 0.41,
  EDGE_RELAY_XZ.z,
);

/**
 * Yard-side metering knot — both outbound gold splines share this waypoint
 * toward utility power & the billing HUD beacon.
 */
export const UTILITY_METERING_HUB_WORLD = new Vector3(-13.6, 6.92, 4.72);
