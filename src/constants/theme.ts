export const COLORS = {
  background: "#FBFBFD",
  surface: "#FFFFFF",
  midnight: "#1C1C1E",
  silver: "#8E8E93",
  separator: "#F2F2F7",
  coral: "#FF6B6B",
  accent: "#3478F6",
  budgetHealthy: "#1C1C1E",
  budgetWarning: "#FF6B6B",
  inputBg: "#F2F2F7",
  pillBg: "#F2F2F7",
  pillText: "#1C1C1E",
  navBg: "#FFFFFF",
  avatarBg: "#E8E8ED",
} as const;

export const BUDGET_WARNING_THRESHOLD = 90;

export const CATEGORY_MAP: Record<string, string> = {
  café: "☕",
  coffee: "☕",
  starbucks: "☕",
  restaurante: "🍽️",
  restaurant: "🍽️",
  pizza: "🍕",
  comida: "🍔",
  lunch: "🍔",
  cena: "🍽️",
  uber: "🚗",
  taxi: "🚕",
  gasolina: "⛽",
  gas: "⛽",
  transporte: "🚗",
  supermercado: "🛒",
  mercadona: "🛒",
  súper: "🛒",
  super: "🛒",
  ropa: "👗",
  zara: "🛍️",
  shopping: "🛍️",
  compras: "🛍️",
  farmacia: "💊",
  médico: "🏥",
  doctor: "🏥",
  gym: "💪",
  netflix: "📺",
  spotify: "🎵",
  suscripción: "💎",
  alquiler: "🏠",
  rent: "🏠",
  luz: "💡",
  agua: "💧",
  internet: "📡",
  teléfono: "📱",
};

export function guessCategoryEmoji(description: string): string {
  const lower = description.toLowerCase().trim();

  for (const [keyword, emoji] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) {
      return emoji;
    }
  }

  return "💰";
}
