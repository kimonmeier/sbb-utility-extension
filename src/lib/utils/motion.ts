// Motion timings loosely follow the Lyne design system's animation
// tokens (sbb-animation-duration-*x), scaled up slightly for the
// larger, slower-reading transitions Svelte drives here (page swaps,
// drill-in navigation, modals) rather than the tiny hover
// micro-interactions the raw tokens target.
export const DURATION_FAST = 120;
export const DURATION_BASE = 200;
export const DURATION_SLOW = 320;
