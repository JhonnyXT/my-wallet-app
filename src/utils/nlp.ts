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

  const milNormalized = text.replace(
    /(\d+)\s*mil\b/gi,
    (_, num) => `${Number(num) * 1000}`
  );

  // Buscar cantidad monetaria con formatos COP: "15.000", "4.50", "60mil", "4500"
  const amountMatch = milNormalized.match(
    /\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\b/
  );

  if (!amountMatch) return null;

  const amountStr = amountMatch[0].replace(",", ".");
  const amount = parseFloat(amountStr);

  if (isNaN(amount) || amount <= 0) return null;

  const description = text
    .replace(/[\d]+[.,]?\d*/g, "")
    .replace(/mil\b/gi, "")
    .replace(/[€$]/g, "")
    .trim() || "Gasto";

  const categoryEmoji = guessCategoryEmoji(description, userCats);

  return { amount, description, categoryEmoji };
}
