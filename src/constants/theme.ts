export const COLORS = {
  primary: "#135bec",
  backgroundLight: "#f6f6f8",
  backgroundDark: "#101622",
  pearl: "#f8f9fa",
  white: "#FFFFFF",
  coral: "#FF6B6B",
  slate900: "#0f172a",
  slate800: "#1e293b",
  slate700: "#334155",
  slate600: "#475569",
  slate400: "#94a3b8",
  slate200: "#e2e8f0",
  slate100: "#f1f5f9",
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
  taco: "🌮",
  uber: "🚗",
  taxi: "🚕",
  gasolina: "⛽",
  gas: "⛽",
  transporte: "🚗",
  supermercado: "🛒",
  mercadona: "🍎",
  súper: "🛒",
  super: "🛒",
  ropa: "🛍️",
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

export const EMOJI_TO_CATEGORY_NAME: Record<string, string> = {
  "☕": "CAFÉ",
  "🍔": "COMIDA",
  "🍕": "COMIDA",
  "🍽️": "RESTAURANTE",
  "🌮": "COMIDA",
  "🚗": "TRANSPORTE",
  "🚕": "TAXI",
  "⛽": "GASOLINA",
  "🛍️": "COMPRAS",
  "🛒": "SÚPER",
  "🍎": "SÚPER",
  "💊": "FARMACIA",
  "🏥": "SALUD",
  "💪": "GYM",
  "📺": "ENTRETE.",
  "🎵": "MÚSICA",
  "🏠": "ALQUILER",
  "💡": "SERVICIOS",
  "📡": "INTERNET",
  "📱": "TELÉFONO",
  "🎮": "GAMING",
  "💎": "SUSCRIPT.",
  "💸": "GASTO",
};

// Exact colors from Figma "Visual Expense Insights Home"
export const CATEGORY_COLORS: Record<string, { bg: string; accent: string }> = {
  "🍔": { bg: "#FFE8D6", accent: "#D2601A" },
  "🍕": { bg: "#FFE8D6", accent: "#D2601A" },
  "🍽️": { bg: "#FFE8D6", accent: "#D2601A" },
  "☕": { bg: "#FFE8D6", accent: "#8B5E3C" },
  "🌮": { bg: "#FFE8D6", accent: "#D2601A" },
  "🎮": { bg: "#D6EFFF", accent: "#1565C0" },
  "🚗": { bg: "#D6EFFF", accent: "#1565C0" },
  "🚕": { bg: "#D6EFFF", accent: "#1565C0" },
  "⛽": { bg: "#D6EFFF", accent: "#006064" },
  "📡": { bg: "#D6EFFF", accent: "#0D47A1" },
  "📱": { bg: "#D6EFFF", accent: "#0D47A1" },
  "💪": { bg: "#D6EFFF", accent: "#0D47A1" },
  "🛍️": { bg: "#FEE2E2", accent: "#C2185B" },
  "🛒": { bg: "#FEE2E2", accent: "#C2185B" },
  "🍎": { bg: "#FEE2E2", accent: "#C2185B" },
  "💊": { bg: "#FEE2E2", accent: "#B71C1C" },
  "🏥": { bg: "#FEE2E2", accent: "#B71C1C" },
  "💡": { bg: "#FEF3C7", accent: "#D97706" },
  "🏠": { bg: "#FEF3C7", accent: "#D97706" },
  "📺": { bg: "#FEF3C7", accent: "#9C6B00" },
  "🎵": { bg: "#FEF3C7", accent: "#9C6B00" },
  "💎": { bg: "#FEF3C7", accent: "#7B5E00" },
  "💸": { bg: "#F1F5F9", accent: "#64748B" },
};

export function getCategoryColor(emoji: string): { bg: string; accent: string } {
  return CATEGORY_COLORS[emoji] ?? { bg: "#F1F5F9", accent: "#64748B" };
}

export function guessCategoryEmoji(description: string): string {
  const lower = description.toLowerCase().trim();

  for (const [keyword, emoji] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) {
      return emoji;
    }
  }

  return "💸";
}
