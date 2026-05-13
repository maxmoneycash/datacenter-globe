/**
 * Shared world-space anchors for procedural layers on the featured NVL rack.
 * Keeps HUD screens aligned with Chapter 2 tour framing.
 */

/** Feet of featured rack cabinet */
export const FEATURED_RACK_BASE = { x: 0, y: 0, z: -2 } as const;

/** Center stack for billboard-style overlays (hardware inventory header, scheduler, NVLink HUD, …) */
export const RACK_FOCUS_BILLBOARD = { x: 0, y: 3.7, z: -2 } as const;

/** Featured compute tray focal height (matches node tour framing) */
export const COMPUTE_TRAY_ORIGIN = { x: 0, y: 3.05, z: -2 } as const;
