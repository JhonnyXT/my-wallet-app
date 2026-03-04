import { guessCategoryEmoji } from "@/src/constants/theme";

export interface ParsedExpense {
  amount: number;
  description: string;
  categoryEmoji: string;
}

/**
 * Parses natural language input like "Uber 15", "Café 4.50", "Gasolina 60 mil"
 * and extracts amount + description + category emoji.
 */
export function parseExpenseInput(raw: string): ParsedExpense | null {
  const text = raw.trim();
  if (!text) return null;

  // "60 mil" / "60mil" → 60000
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

  const categoryEmoji = guessCategoryEmoji(description);

  return { amount, description, categoryEmoji };
}
