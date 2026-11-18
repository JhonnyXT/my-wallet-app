/**
 * Tipos y helpers compartidos entre CategoryChart.tsx (barras + gestos) y CategoryChartPopups.tsx
 * (BudgetEditModal/CategoryPopup). Viven acá, no en ninguno de los dos, para no crear un import
 * circular entre ambos archivos.
 */
import { getCategoryName } from "@/src/constants/theme";

export interface BudgetEditState {
  emoji: string;
  currentBudget: number; // límite ya guardado (0 si no hay)
  spent: number; // monto gastado este mes en esa categoría
}

export interface PopupState {
  emoji: string;
  total: number;
  budget?: number;
  /** posición izquierda del popup relativa al chart container */
  xHint: number;
  /** qué opción está resaltada según el deslizamiento */
  selection: "up" | "down" | null;
  isIncomeMode?: boolean;
}

export function fmtCOP(n: number): string {
  return `$ ${Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export function getCategoryDisplayName(
  emoji: string,
  userCats?: import("@/src/constants/categoryPresets").UserCategory[],
  goals?: { emoji: string; name: string }[],
): string {
  const raw = getCategoryName(emoji, userCats);
  if (raw === emoji) {
    // getCategoryName no encontró un nombre → buscar en metas primero
    if (goals) {
      const goalMatch = goals.find((g) => g.emoji === emoji);
      if (goalMatch)
        return goalMatch.name.charAt(0).toUpperCase() + goalMatch.name.slice(1).toLowerCase();
    }
    // Fallback genérico para evitar mostrar el emoji como nombre
    return "General";
  }
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}
