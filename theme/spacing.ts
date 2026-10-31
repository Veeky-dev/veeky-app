/**
 * ./theme/spacing.ts
 *
 * Spacing scale for Veeky: an 8-pt grid with 4-pt half steps.
 * Use these for margins, paddings and gaps instead of raw numbers,
 * so screens line up and spacing stays consistent.
 *
 *   xs  4   tight: icon ↔ label, small pill padding
 *   sm  8   default gap between related items
 *   md  12  inner padding of buttons/pills, screen-edge inset in overlays
 *   lg  16  gap between groups, sheet padding
 *   xl  24  gap between sections / action buttons
 *   xxl 32  large separation
 */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;
