/**
 * Single source of truth for hero shell bounding box math.
 * Must stay in sync with `SiteShell` mesh placement.
 */
export const SITE_SHELL_BOX = {
  center: [2, 3.5, -4] as const,
  halfSize: [16, 3.5, 10] as const,
};

/** World-space Y at the roof deck plane (outside insulation line). */
export const SITE_ROOF_DECK_Y =
  SITE_SHELL_BOX.center[1] + SITE_SHELL_BOX.halfSize[1];
