import { guessCategoryEmoji } from "@/src/constants/theme";
import type { UserCategory } from "@/src/constants/categoryPresets";

export interface ParsedExpense {
  amount: number;
  description: string;
  categoryEmoji: string;
}

/**
 * Parses natural language input like "Uber 15", "Café 4.50", "Gasolina 60 mil"
 * and extracts amount + description + category emoji.
 * Accepts optional userCategories to prioritize user-defined keywords.
 */
export function parseExpenseInput(raw: string, userCats?: UserCategory[]): ParsedExpense | null {
  const text = raw.trim();
  if (!text) return null;

  const milNormalized = text.replace(/(\d+)\s*mil\b/gi, (_, num) => `${Number(num) * 1000}`);

  // Buscar cantidad monetaria con formatos COP: "15.000", "4.50", "60mil", "4500"
  const amountMatch = milNormalized.match(
    /\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\b/,
  );

  if (!amountMatch) return null;

  // Si el último separador va seguido de exactamente 3 dígitos ("15.000"), es
  // notación de miles COP: quitar separadores y parsear como entero.
  // Si va seguido de 1-2 dígitos ("4.50"), es decimal: normalizar a punto.
  // parseFloat() a secas confunde ambos casos ("15.000" → 15, no 15000).
  const matchedStr = amountMatch[0];
  const lastSeparator = matchedStr.match(/[.,](\d+)$/);
  const amount =
    lastSeparator && lastSeparator[1].length === 3
      ? parseInt(matchedStr.replace(/[.,]/g, ""), 10)
      : parseFloat(matchedStr.replace(",", "."));

  if (isNaN(amount) || amount <= 0) return null;

  const description =
    text
      .replace(/[\d]+[.,]?\d*/g, "")
      .replace(/mil\b/gi, "")
      .replace(/[€$]/g, "")
      .trim() || "Gasto";

  const categoryEmoji = guessCategoryEmoji(description, userCats);

  return { amount, description, categoryEmoji };
}
