/**
 * categoryPresets.ts — Catálogo de categorías predefinidas + paleta de colores + emojis curados.
 *
 * Las categorías de gasto incluyen las 8 originales + 10 adicionales.
 * Las categorías de ingreso incluyen las 5 originales + 1 adicional.
 * El usuario elige cuáles quiere en el onboarding y puede crear nuevas.
 */

// ─── Tipo compartido ──────────────────────────────────────────────────────────

export interface UserCategory {
  id: string;
  emoji: string;
  name: string;
  colorBg: string;
  colorAccent: string;
  type: "expense" | "income";
  keywords: string[];
  isPreset: boolean;
}

// ─── Paleta de colores premium para categorías custom ─────────────────────────

export const CATEGORY_COLOR_PALETTE: { bg: string; accent: string }[] = [
  { bg: "#DBEAFE", accent: "#2563EB" },  // Azul
  { bg: "#D1FAE5", accent: "#059669" },  // Verde
  { bg: "#FEE2E2", accent: "#DC2626" },  // Rojo
  { bg: "#EDE9FE", accent: "#7C3AED" },  // Púrpura
  { bg: "#FFE8D6", accent: "#D2601A" },  // Naranja
  { bg: "#FEF3C7", accent: "#D97706" },  // Ámbar
  { bg: "#FCE7F3", accent: "#DB2777" },  // Rosa
  { bg: "#CCFBF1", accent: "#0D9488" },  // Teal
  { bg: "#E0E7FF", accent: "#4338CA" },  // Índigo
  { bg: "#F3F4F6", accent: "#374151" },  // Gris
  { bg: "#FEF9C3", accent: "#A16207" },  // Amarillo
  { bg: "#CFFAFE", accent: "#0891B2" },  // Cyan
];

// ─── Emojis curados para el selector de categorías custom ─────────────────────

export const CURATED_EMOJIS: string[] = [
  // Finanzas / dinero
  "💰", "💵", "💳", "🏦", "💸", "🪙", "📊", "📈",
  // Comida / bebida
  "🍔", "🍕", "🍩", "☕", "🍺", "🍷", "🛒", "🥗",
  // Transporte
  "🚗", "🚕", "🚌", "✈️", "🚲", "⛽", "🛵", "🚇",
  // Hogar / servicios
  "🏠", "🔑", "💡", "🔧", "📱", "💻", "📺", "🛋️",
  // Compras / ropa
  "🛍️", "👕", "👟", "💎", "👜", "🎒", "⌚", "🕶️",
  // Salud / bienestar
  "🏥", "💊", "🏋️", "🧘", "🦷", "❤️", "🩺", "💆",
  // Entretenimiento
  "🎮", "🎬", "🎵", "📚", "🎨", "🎳", "🎪", "🎤",
  // Educación / trabajo
  "🎓", "📖", "✏️", "💼", "🏢", "📝", "🎯", "🔬",
  // Personas / personal
  "👤", "👶", "👨‍👩‍👧", "💇", "🧴", "💅", "🎁", "💍",
  // Animales / mascotas
  "🐕", "🐈", "🐾", "🐟", "🦜", "🐇", "🐢", "🦮",
  // Viajes / ocio
  "🌴", "⛱️", "🏔️", "🎢", "🏖️", "🗺️", "📸", "🧳",
  // Deportes
  "⚽", "🏀", "🎾", "🏊", "🚴", "⛳", "🥊", "🏆",
];

// ─── Presets de gastos (18 categorías) ────────────────────────────────────────

export const EXPENSE_PRESETS: UserCategory[] = [
  {
    id: "preset_food", emoji: "🍔", name: "Comida",
    colorBg: "#FFE8D6", colorAccent: "#D2601A", type: "expense", isPreset: true,
    keywords: ["café", "coffee", "starbucks", "restaurante", "restaurant", "pizza", "comida", "lunch", "cena", "taco", "mercado", "supermercado", "súper", "super", "domicilio", "almuerzo"],
  },
  {
    id: "preset_transport", emoji: "🚗", name: "Transporte",
    colorBg: "#D6EFFF", colorAccent: "#1565C0", type: "expense", isPreset: true,
    keywords: ["uber", "taxi", "gasolina", "gas", "transporte", "bus", "metro", "moto", "peaje"],
  },
  {
    id: "preset_home", emoji: "🏠", name: "Hogar",
    colorBg: "#FEF3C7", colorAccent: "#D97706", type: "expense", isPreset: true,
    keywords: ["arriendo", "alquiler", "rent", "luz", "agua", "internet", "servicios", "reparacion", "hogar", "electricidad"],
  },
  {
    id: "preset_shopping", emoji: "🛍️", name: "Compras",
    colorBg: "#FEE2E2", colorAccent: "#C2185B", type: "expense", isPreset: true,
    keywords: ["ropa", "zara", "shopping", "compras", "gadget", "tecnologia", "amazon"],
  },
  {
    id: "preset_health", emoji: "🏥", name: "Salud",
    colorBg: "#FCE4EC", colorAccent: "#C62828", type: "expense", isPreset: true,
    keywords: ["farmacia", "médico", "doctor", "medico", "hospital", "clinica", "salud", "medicamento", "cita"],
  },
  {
    id: "preset_entertainment", emoji: "🎮", name: "Entretenimiento",
    colorBg: "#EDE9FE", colorAccent: "#6D28D9", type: "expense", isPreset: true,
    keywords: ["netflix", "spotify", "cine", "pelicula", "juego", "game", "concierto", "teatro", "suscripcion", "suscripción", "playstation", "xbox", "gaming"],
  },
  {
    id: "preset_education", emoji: "🎓", name: "Educación",
    colorBg: "#D1FAE5", colorAccent: "#059669", type: "expense", isPreset: true,
    keywords: ["curso", "libro", "educacion", "universidad", "colegio", "escuela", "capacitacion"],
  },
  {
    id: "preset_personal", emoji: "👤", name: "Personal",
    colorBg: "#F1F5F9", colorAccent: "#475569", type: "expense", isPreset: true,
    keywords: ["personal", "peluqueria", "barberia", "cuidado", "spa", "belleza"],
  },
  {
    id: "preset_clothing", emoji: "👕", name: "Ropa",
    colorBg: "#FCE7F3", colorAccent: "#DB2777", type: "expense", isPreset: true,
    keywords: ["ropa", "zapatos", "camisa", "pantalón", "vestido", "chaqueta", "zapatillas"],
  },
  {
    id: "preset_pets", emoji: "🐾", name: "Mascotas",
    colorBg: "#FEF3C7", colorAccent: "#A16207", type: "expense", isPreset: true,
    keywords: ["mascota", "veterinario", "perro", "gato", "comida mascota", "veterinaria"],
  },
  {
    id: "preset_car", emoji: "🚙", name: "Vehículo",
    colorBg: "#DBEAFE", colorAccent: "#2563EB", type: "expense", isPreset: true,
    keywords: ["auto", "carro", "coche", "mantenimiento", "taller", "seguro auto", "lavado", "parqueadero"],
  },
  {
    id: "preset_luxury", emoji: "💎", name: "Lujo",
    colorBg: "#EDE9FE", colorAccent: "#7C3AED", type: "expense", isPreset: true,
    keywords: ["lujo", "joya", "reloj", "perfume", "marca", "diseñador"],
  },
  {
    id: "preset_travel", emoji: "✈️", name: "Viajes",
    colorBg: "#CFFAFE", colorAccent: "#0891B2", type: "expense", isPreset: true,
    keywords: ["viaje", "vuelo", "hotel", "hospedaje", "airbnb", "vacaciones", "turismo", "pasaje"],
  },
  {
    id: "preset_subscriptions", emoji: "📱", name: "Suscripciones",
    colorBg: "#E0E7FF", colorAccent: "#4338CA", type: "expense", isPreset: true,
    keywords: ["suscripcion", "mensualidad", "plan", "membresía", "membresia", "premium"],
  },
  {
    id: "preset_sports", emoji: "⚽", name: "Deportes",
    colorBg: "#D1FAE5", colorAccent: "#059669", type: "expense", isPreset: true,
    keywords: ["gym", "gimnasio", "deporte", "fútbol", "futbol", "cancha", "entrenamiento", "fitness"],
  },
  {
    id: "preset_coffee", emoji: "☕", name: "Café",
    colorBg: "#FFE8D6", colorAccent: "#92400E", type: "expense", isPreset: true,
    keywords: ["café", "coffee", "starbucks", "tinto", "capuchino", "latte"],
  },
  {
    id: "preset_gifts", emoji: "🎁", name: "Regalos",
    colorBg: "#FEF9C3", colorAccent: "#A16207", type: "expense", isPreset: true,
    keywords: ["regalo", "obsequio", "detalle", "sorpresa", "cumpleaños"],
  },
  {
    id: "preset_eating_out", emoji: "🍽️", name: "Comer afuera",
    colorBg: "#FFE8D6", colorAccent: "#B45309", type: "expense", isPreset: true,
    keywords: ["restaurante", "comer afuera", "comida rapida", "buffet", "brunch"],
  },
];

// ─── Presets de ingresos (6 categorías) ───────────────────────────────────────

export const INCOME_PRESETS: UserCategory[] = [
  {
    id: "preset_salary", emoji: "💼", name: "Salario",
    colorBg: "#DBEAFE", colorAccent: "#1D4ED8", type: "income", isPreset: true,
    keywords: ["salario", "nómina", "nomina", "sueldo", "quincena", "pago empresa", "mensualidad"],
  },
  {
    id: "preset_freelance", emoji: "💻", name: "Freelance",
    colorBg: "#E0E7FF", colorAccent: "#4338CA", type: "income", isPreset: true,
    keywords: ["freelance", "proyecto", "honorarios", "consultoría", "consultoria", "contrato", "cliente"],
  },
  {
    id: "preset_investments", emoji: "📈", name: "Inversiones",
    colorBg: "#D1FAE5", colorAccent: "#059669", type: "income", isPreset: true,
    keywords: ["inversión", "inversion", "dividendos", "intereses", "rendimientos", "acciones", "cripto"],
  },
  {
    id: "preset_extra", emoji: "🎁", name: "Extra",
    colorBg: "#FEF3C7", colorAccent: "#B45309", type: "income", isPreset: true,
    keywords: ["regalo", "bono", "reembolso", "devolución", "devolucion", "venta", "comisión", "comision"],
  },
  {
    id: "preset_business", emoji: "🏢", name: "Negocio",
    colorBg: "#F3F4F6", colorAccent: "#374151", type: "income", isPreset: true,
    keywords: ["negocio", "ventas", "factura", "cobro", "ingreso negocio"],
  },
  {
    id: "preset_other_income", emoji: "💰", name: "Otros ingresos",
    colorBg: "#CCFBF1", colorAccent: "#0D9488", type: "income", isPreset: true,
    keywords: ["ingreso", "recibí", "cobré", "transferencia"],
  },
];

/** Todos los presets disponibles para seleccionar en el onboarding */
export const ALL_PRESETS: UserCategory[] = [...EXPENSE_PRESETS, ...INCOME_PRESETS];
