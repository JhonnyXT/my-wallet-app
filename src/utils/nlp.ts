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

  const amountMatch = milNormalized.match(
    /[\d]+[.,]?\d*/
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
