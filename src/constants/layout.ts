/** Height of the floating dock row (pill + FAB) — Stitch JSX: height 64px */
export const DOCK_HEIGHT = 64;

/** Gap between dock bottom edge and device bottom — Stitch JSX: bottom 40px */
export const DOCK_BOTTOM_OFFSET = 40;

/**
 * Minimum extra space a screen's ScrollView needs at the bottom
 * so no content hides behind the floating dock.
 * Buffer de 48px extra para cubrir la sombra del dock y cualquier variación de dispositivo.
 */
export function scrollBottomPadding(safeAreaBottom: number): number {
  return Math.max(safeAreaBottom, 0) + DOCK_BOTTOM_OFFSET + DOCK_HEIGHT + 48;
}
