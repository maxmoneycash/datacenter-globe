/**
 * Shared HUD chrome.
 *
 * Every floating panel on the globe used to carry its own copy of the
 * background / blur / border / radius values, which is how the stats card and
 * the legend ended up stacked on top of each other in the same corner with
 * slightly different greys. Panels now take their surface from here and their
 * position from the layout rails in GlobeDashboard, so there is exactly one
 * place to change either.
 */

/** Frosted panel surface — the default for anything floating over the globe. */
export const HUD_PANEL =
  'bg-[#0c0c0e]/92 backdrop-blur-xl border border-white/12 rounded-xl shadow-2xl shadow-black/50';

/** Lighter variant for chips and pills that sit directly on the globe. */
export const HUD_CHIP =
  'bg-[#0c0c0e]/85 backdrop-blur-md border border-white/12 rounded-full shadow-lg';

/** Section heading inside a panel. */
export const HUD_SECTION_LABEL =
  'text-[9px] uppercase tracking-widest text-white/40';

/** The monospace face used across the whole HUD. */
export const HUD_MONO = 'JetBrains Mono, monospace';

/** Accent used for interactive/active HUD affordances. */
export const HUD_ACCENT = '#ff9f43';

/**
 * Vertical gap between stacked panels in a rail, in pixels. Exported so the
 * rails and the panels agree without hard-coding the number twice.
 */
export const HUD_GAP = 12;
