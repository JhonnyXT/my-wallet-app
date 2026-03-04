/** Height of the floating dock row (pill + FAB) */
export const DOCK_HEIGHT = 80;

/** Gap between dock bottom edge and the device safe-area bottom */
export const DOCK_BOTTOM_OFFSET = 20;

/**
 * Minimum extra space a screen's ScrollView needs at the bottom
 * so no content hides behind the floating dock.
 * Usage: contentContainerStyle={{ paddingBottom: scrollBottomPadding(insets.bottom) }}
 */
export function scrollBottomPadding(safeAreaBottom: number): number {
  return Math.max(safeAreaBottom, 0) + DOCK_BOTTOM_OFFSET + DOCK_HEIGHT + 24;
}
