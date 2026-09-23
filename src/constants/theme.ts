import { fuzzyIncludes } from "@/src/utils/fuzzyMatch";

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

/**
 * @deprecated Usar `categoryPresets.ts` + `userCategories` del store.
 * Mapas de palabras clave → emoji para el fallback de `guessCategoryEmoji`,
 * separados por tipo — mantener así: algunas palabras se repiten entre gasto
 * e ingreso con significados distintos (ej. "mensualidad" es una suscripción
 * que pagas o el salario que recibes; "regalo" es un regalo que compras o
 * plata que te regalan), así que buscar en un solo mapa sin filtrar por tipo
 * hace que un ingreso real caiga en una categoría de gasto (o viceversa) solo
 * por coincidir en la palabra — bug real encontrado 2026-09-23.
 * Mantener solo como fallback; no extender con nuevas categorías.
 */
export const EXPENSE_CATEGORY_MAP: Record<string, string> = {
  // 🍔 Comida
  café: "🍔",
  coffee: "🍔",
  starbucks: "🍔",
  restaurante: "🍔",
  restaurant: "🍔",
  pizza: "🍔",
  comida: "🍔",
  lunch: "🍔",
  cena: "🍔",
  taco: "🍔",
  mercado: "🍔",
  supermercado: "🍔",
  súper: "🍔",
  super: "🍔",
  domicilio: "🍔",
  almuerzo: "🍔",
  // 🚗 Transporte
  uber: "🚗",
  taxi: "🚗",
  gasolina: "🚗",
  gas: "🚗",
  transporte: "🚗",
  bus: "🚗",
  metro: "🚗",
  moto: "🚗",
  // 🏠 Hogar
  arriendo: "🏠",
  alquiler: "🏠",
  rent: "🏠",
  luz: "🏠",
  agua: "🏠",
  internet: "🏠",
  servicios: "🏠",
  reparacion: "🏠",
  hogar: "🏠",
  electricidad: "🏠",
  // 🛍️ Compras
  ropa: "🛍️",
  zara: "🛍️",
  shopping: "🛍️",
  compras: "🛍️",
  gadget: "🛍️",
  tecnologia: "🛍️",
  amazon: "🛍️",
  // 🏥 Salud
  farmacia: "🏥",
  médico: "🏥",
  doctor: "🏥",
  medico: "🏥",
  hospital: "🏥",
  clinica: "🏥",
  salud: "🏥",
  medicamento: "🏥",
  cita: "🏥",
  gym: "🏥",
  // 🎮 Entretenimiento
  netflix: "🎮",
  spotify: "🎮",
  cine: "🎮",
  pelicula: "🎮",
  juego: "🎮",
  game: "🎮",
  concierto: "🎮",
  teatro: "🎮",
  suscripcion: "🎮",
  suscripción: "🎮",
  playstation: "🎮",
  xbox: "🎮",
  gaming: "🎮",
  // 🎓 Educación
  curso: "🎓",
  libro: "🎓",
  educacion: "🎓",
  universidad: "🎓",
  colegio: "🎓",
  escuela: "🎓",
  capacitacion: "🎓",
  // 👤 Personal
  personal: "👤",
  peluqueria: "👤",
  barberia: "👤",
  cuidado: "👤",
  spa: "👤",
  belleza: "👤",
};

export const INCOME_CATEGORY_MAP: Record<string, string> = {
  // 💼 Salario
  salario: "💼",
  nómina: "💼",
  nomina: "💼",
  sueldo: "💼",
  quincena: "💼",
  "pago empresa": "💼",
  mensualidad: "💼",
  // 💻 Freelance
  freelance: "💻",
  proyecto: "💻",
  honorarios: "💻",
  consultoría: "💻",
  consultoria: "💻",
  contrato: "💻",
  // 📈 Inversiones
  inversión: "📈",
  inversion: "📈",
  dividendos: "📈",
  intereses: "📈",
  rendimientos: "📈",
  acciones: "📈",
  cripto: "📈",
  // 🎁 Extra
  regalo: "🎁",
  bono: "🎁",
  reembolso: "🎁",
  devolución: "🎁",
  devolucion: "🎁",
  venta: "🎁",
  comisión: "🎁",
  comision: "🎁",
  // 🏢 Negocio
  negocio: "🏢",
  ventas: "🏢",
  factura: "🏢",
  cobro: "🏢",
};

/** @deprecated Ambos mapas fusionados — solo para el caso sin `isExpense` conocido. */
export const CATEGORY_MAP: Record<string, string> = {
  ...EXPENSE_CATEGORY_MAP,
  ...INCOME_CATEGORY_MAP,
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
  "🍔": { bg: "#FFE8D6", accent: "#D2601A" }, // Comida — naranja
  "🚗": { bg: "#D6EFFF", accent: "#1565C0" }, // Transporte — azul
  "🏠": { bg: "#FEF3C7", accent: "#D97706" }, // Hogar — amarillo
  "🛍️": { bg: "#FEE2E2", accent: "#C2185B" }, // Compras — rosa
  "🏥": { bg: "#FCE4EC", accent: "#C62828" }, // Salud — rojo
  "🎮": { bg: "#EDE9FE", accent: "#6D28D9" }, // Entretenimiento — púrpura
  "🎓": { bg: "#D1FAE5", accent: "#059669" }, // Educación — verde
  "👤": { bg: "#F1F5F9", accent: "#475569" }, // Personal — gris
  // Ingresos
  "💼": { bg: "#DBEAFE", accent: "#1D4ED8" }, // Salario — azul
  "💻": { bg: "#E0E7FF", accent: "#4338CA" }, // Freelance — índigo
  "📈": { bg: "#D1FAE5", accent: "#059669" }, // Inversiones — verde
  "🎁": { bg: "#FEF3C7", accent: "#B45309" }, // Extra — ámbar
  "🏢": { bg: "#F3F4F6", accent: "#374151" }, // Negocio — gris oscuro
};

export function getCategoryColor(
  emoji: string,
  userCats?: import("@/src/constants/categoryPresets").UserCategory[],
): { bg: string; accent: string } {
  if (userCats) {
    const match = userCats.find((c) => c.emoji === emoji);
    if (match) return { bg: match.colorBg, accent: match.colorAccent };
  }
  return CATEGORY_COLORS[emoji] ?? { bg: "#F1F5F9", accent: "#64748B" };
}

/** @deprecated Usar userCategories del store. Fallback legacy. */
export const ALL_CATEGORY_EMOJIS: string[] = ["🍔", "🚗", "🏠", "🛍️", "🏥", "🎮", "🎓", "👤"];

/** @deprecated Usar userCategories del store. Fallback legacy. */
export const ALL_INCOME_EMOJIS: string[] = ["💼", "💻", "📈", "🎁", "🏢"];

/**
 * Detecta categoría por keywords. Consulta primero las categorías del usuario,
 * luego el mapa legacy como fallback.
 *
 * `isExpense`, si se conoce, filtra ambas fuentes a solo categorías de ese
 * tipo — algunas palabras clave se repiten entre gasto e ingreso con
 * significado distinto (ej. "mensualidad" es una suscripción que pagas O el
 * salario que recibes; "regalo" es un regalo que compras O plata que te
 * regalan). Sin este filtro, un ingreso real podía caer en una categoría de
 * gasto (o viceversa) solo por coincidir en la palabra, con el gasto/ingreso
 * decidiendo el orden de búsqueda arbitrariamente — bug real encontrado
 * 2026-09-23. Si no se pasa `isExpense` (llamador no lo sabe con certeza),
 * se busca en ambos tipos como antes.
 */
export function guessCategoryEmoji(
  description: string,
  userCats?: import("@/src/constants/categoryPresets").UserCategory[],
  isExpense?: boolean,
): string {
  const lower = description.toLowerCase().trim();

  if (userCats) {
    const relevant =
      isExpense === undefined
        ? userCats
        : userCats.filter((c) => c.type === (isExpense ? "expense" : "income"));
    for (const cat of relevant) {
      if (cat.keywords.some((kw) => fuzzyIncludes(lower, kw))) return cat.emoji;
    }
  }

  const map =
    isExpense === undefined ? CATEGORY_MAP : isExpense ? EXPENSE_CATEGORY_MAP : INCOME_CATEGORY_MAP;
  for (const [keyword, emoji] of Object.entries(map)) {
    if (fuzzyIncludes(lower, keyword)) return emoji;
  }

  return "💸";
}

/**
 * Devuelve el nombre de la categoría. Consulta primero userCategories, luego el mapa legacy.
 */
export function getCategoryName(
  emoji: string,
  userCats?: import("@/src/constants/categoryPresets").UserCategory[],
): string {
  if (userCats) {
    const match = userCats.find((c) => c.emoji === emoji);
    if (match) return match.name.toUpperCase();
  }
  return EMOJI_TO_CATEGORY_NAME[emoji] ?? emoji;
}
