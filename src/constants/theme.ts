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

export function getCategoryColor(emoji: string): { bg: string; accent: string } {
  return CATEGORY_COLORS[emoji] ?? { bg: "#F1F5F9", accent: "#64748B" };
}

/** Lista canónica de las 8 categorías de gastos */
export const ALL_CATEGORY_EMOJIS: string[] = [
  "🍔", "🚗", "🏠", "🛍️", "🏥", "🎮", "🎓", "👤",
];

/** Lista canónica de las 5 categorías de ingresos */
export const ALL_INCOME_EMOJIS: string[] = [
  "💼", "💻", "📈", "🎁", "🏢",
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
