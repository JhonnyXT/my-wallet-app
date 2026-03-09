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
  // 🍔 Comida
  café: "🍔", coffee: "🍔", starbucks: "🍔",
  restaurante: "🍔", restaurant: "🍔", pizza: "🍔",
  comida: "🍔", lunch: "🍔", cena: "🍔", taco: "🍔",
  mercado: "🍔", supermercado: "🍔", súper: "🍔", super: "🍔",
  domicilio: "🍔", almuerzo: "🍔",
  // 🚗 Transporte
  uber: "🚗", taxi: "🚗", gasolina: "🚗", gas: "🚗",
  transporte: "🚗", bus: "🚗", metro: "🚗", moto: "🚗",
  // 🏠 Hogar
  arriendo: "🏠", alquiler: "🏠", rent: "🏠",
  luz: "🏠", agua: "🏠", internet: "🏠",
  servicios: "🏠", reparacion: "🏠", hogar: "🏠",
  electricidad: "🏠",
  // 🛍️ Compras
  ropa: "🛍️", zara: "🛍️", shopping: "🛍️", compras: "🛍️",
  gadget: "🛍️", tecnologia: "🛍️", amazon: "🛍️",
  // 🏥 Salud
  farmacia: "🏥", médico: "🏥", doctor: "🏥", medico: "🏥",
  hospital: "🏥", clinica: "🏥", salud: "🏥",
  medicamento: "🏥", cita: "🏥", gym: "🏥",
  // 🎮 Entretenimiento
  netflix: "🎮", spotify: "🎮", cine: "🎮", pelicula: "🎮",
  juego: "🎮", game: "🎮", concierto: "🎮", teatro: "🎮",
  suscripcion: "🎮", suscripción: "🎮", playstation: "🎮",
  xbox: "🎮", gaming: "🎮",
  // 🎓 Educación
  curso: "🎓", libro: "🎓", educacion: "🎓", universidad: "🎓",
  colegio: "🎓", escuela: "🎓", capacitacion: "🎓",
  // 👤 Personal
  personal: "👤", peluqueria: "👤", barberia: "👤",
  cuidado: "👤", spa: "👤", belleza: "👤",
};

export const EMOJI_TO_CATEGORY_NAME: Record<string, string> = {
  "🍔": "COMIDA",
  "🚗": "TRANSPORTE",
  "🏠": "HOGAR",
  "🛍️": "COMPRAS",
  "🏥": "SALUD",
  "🎮": "ENTRETENIMIENTO",
  "🎓": "EDUCACIÓN",
  "👤": "PERSONAL",
};

export const CATEGORY_COLORS: Record<string, { bg: string; accent: string }> = {
  "🍔": { bg: "#FFE8D6", accent: "#D2601A" },  // Comida — naranja
  "🚗": { bg: "#D6EFFF", accent: "#1565C0" },  // Transporte — azul
  "🏠": { bg: "#FEF3C7", accent: "#D97706" },  // Hogar — amarillo
  "🛍️": { bg: "#FEE2E2", accent: "#C2185B" }, // Compras — rosa
  "🏥": { bg: "#FCE4EC", accent: "#C62828" },  // Salud — rojo
  "🎮": { bg: "#EDE9FE", accent: "#6D28D9" },  // Entretenimiento — púrpura
  "🎓": { bg: "#D1FAE5", accent: "#059669" },  // Educación — verde
  "👤": { bg: "#F1F5F9", accent: "#475569" },  // Personal — gris
};

export function getCategoryColor(emoji: string): { bg: string; accent: string } {
  return CATEGORY_COLORS[emoji] ?? { bg: "#F1F5F9", accent: "#64748B" };
}

/** Lista canónica de las 8 categorías estándar del sistema */
export const ALL_CATEGORY_EMOJIS: string[] = [
  "🍔", "🚗", "🏠", "🛍️", "🏥", "🎮", "🎓", "👤",
];

export function guessCategoryEmoji(description: string): string {
  const lower = description.toLowerCase().trim();

  for (const [keyword, emoji] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) {
      return emoji;
    }
  }

  return "💸";
}
