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
  // ── Categorías de ingresos ──────────────────────────────────────────────────
  // 💼 Salario
  salario: "💼", nómina: "💼", nomina: "💼", sueldo: "💼",
  quincena: "💼", "pago empresa": "💼", mensualidad: "💼",
  // 💻 Freelance
  freelance: "💻", proyecto: "💻", honorarios: "💻",
  consultoría: "💻", consultoria: "💻", contrato: "💻",
  // 📈 Inversiones
  inversión: "📈", inversion: "📈", dividendos: "📈",
  intereses: "📈", rendimientos: "📈", acciones: "📈", cripto: "📈",
  // 🎁 Extra
  regalo: "🎁", bono: "🎁", reembolso: "🎁",
  devolución: "🎁", devolucion: "🎁", venta: "🎁", comisión: "🎁", comision: "🎁",
  // 🏢 Negocio
  negocio: "🏢", ventas: "🏢", factura: "🏢", cobro: "🏢",
};

export const EMOJI_TO_CATEGORY_NAME: Record<string, string> = {
  // Gastos
  "🍔": "COMIDA",
  "🚗": "TRANSPORTE",
  "🏠": "HOGAR",
  "🛍️": "COMPRAS",
  "🏥": "SALUD",
  "🎮": "ENTRETENIMIENTO",
  "🎓": "EDUCACIÓN",
  "👤": "PERSONAL",
  // Ingresos
  "💼": "SALARIO",
  "💻": "FREELANCE",
  "📈": "INVERSIONES",
  "🎁": "EXTRA",
  "🏢": "NEGOCIO",
};

export const CATEGORY_COLORS: Record<string, { bg: string; accent: string }> = {
  // Gastos
  "🍔": { bg: "#FFE8D6", accent: "#D2601A" },  // Comida — naranja
  "🚗": { bg: "#D6EFFF", accent: "#1565C0" },  // Transporte — azul
  "🏠": { bg: "#FEF3C7", accent: "#D97706" },  // Hogar — amarillo
  "🛍️": { bg: "#FEE2E2", accent: "#C2185B" }, // Compras — rosa
  "🏥": { bg: "#FCE4EC", accent: "#C62828" },  // Salud — rojo
  "🎮": { bg: "#EDE9FE", accent: "#6D28D9" },  // Entretenimiento — púrpura
  "🎓": { bg: "#D1FAE5", accent: "#059669" },  // Educación — verde
  "👤": { bg: "#F1F5F9", accent: "#475569" },  // Personal — gris
  // Ingresos
  "💼": { bg: "#DBEAFE", accent: "#1D4ED8" },  // Salario — azul
  "💻": { bg: "#E0E7FF", accent: "#4338CA" },  // Freelance — índigo
  "📈": { bg: "#D1FAE5", accent: "#059669" },  // Inversiones — verde
  "🎁": { bg: "#FEF3C7", accent: "#B45309" },  // Extra — ámbar
  "🏢": { bg: "#F3F4F6", accent: "#374151" },  // Negocio — gris oscuro
};

export function getCategoryColor(emoji: string, userCats?: import("@/src/constants/categoryPresets").UserCategory[]): { bg: string; accent: string } {
  if (userCats) {
    const match = userCats.find((c) => c.emoji === emoji);
    if (match) return { bg: match.colorBg, accent: match.colorAccent };
  }
  return CATEGORY_COLORS[emoji] ?? { bg: "#F1F5F9", accent: "#64748B" };
}

/** @deprecated Usar userCategories del store. Fallback legacy. */
export const ALL_CATEGORY_EMOJIS: string[] = [
  "🍔", "🚗", "🏠", "🛍️", "🏥", "🎮", "🎓", "👤",
];

/** @deprecated Usar userCategories del store. Fallback legacy. */
export const ALL_INCOME_EMOJIS: string[] = [
  "💼", "💻", "📈", "🎁", "🏢",
];

/**
 * Detecta categoría por keywords. Consulta primero las categorías del usuario,
 * luego el mapa legacy como fallback.
 */
export function guessCategoryEmoji(description: string, userCats?: import("@/src/constants/categoryPresets").UserCategory[]): string {
  const lower = description.toLowerCase().trim();

  if (userCats) {
    for (const cat of userCats) {
      if (cat.keywords.some((kw) => lower.includes(kw))) return cat.emoji;
    }
  }

  for (const [keyword, emoji] of Object.entries(CATEGORY_MAP)) {
    if (lower.includes(keyword)) return emoji;
  }

  return "💸";
}

/**
 * Devuelve el nombre de la categoría. Consulta primero userCategories, luego el mapa legacy.
 */
export function getCategoryName(emoji: string, userCats?: import("@/src/constants/categoryPresets").UserCategory[]): string {
  if (userCats) {
    const match = userCats.find((c) => c.emoji === emoji);
    if (match) return match.name.toUpperCase();
  }
  return EMOJI_TO_CATEGORY_NAME[emoji] ?? emoji;
}
