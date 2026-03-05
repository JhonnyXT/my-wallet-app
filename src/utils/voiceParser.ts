/**
 * voiceParser — convierte texto de voz en datos estructurados de gasto.
 * 100% offline, sin APIs externas. Regex + mapeo de palabras clave en español.
 */
import type { ActiveExpense, DateOption } from "@/src/store/useExpenseStore";

// ─── Mapa de categorías ───────────────────────────────────────────────────────
const CATEGORY_MAP: { keywords: string[]; emoji: string; name: string }[] = [
  {
    keywords: ["uber", "taxi", "bus", "metro", "transporte", "gasolina",
      "combustible", "shuttle", "vuelo", "avion", "tren", "moto", "peaje"],
    emoji: "🚗", name: "Transporte",
  },
  {
    keywords: ["restaurante", "almuerzo", "cena", "desayuno", "mcdonalds",
      "pizza", "burger", "sushi", "comida", "comer", "pollo", "empanada"],
    emoji: "🍔", name: "Comida",
  },
  {
    keywords: ["cafe", "coffee", "starbucks", "tinto", "capuchino", "latte"],
    emoji: "☕", name: "Café",
  },
  {
    keywords: ["supermercado", "mercado", "tienda", "zara", "ropa",
      "compras", "exito", "carulla", "jumbo"],
    emoji: "🛍️", name: "Compras",
  },
  {
    keywords: ["luz", "agua", "gas", "internet", "servicios", "arriendo",
      "alquiler", "celular", "telefono"],
    emoji: "💡", name: "Servicios",
  },
  {
    keywords: ["cine", "netflix", "juego", "entretenimiento", "playstation",
      "xbox", "spotify", "concierto", "pelicula"],
    emoji: "🎮", name: "Entretenimiento",
  },
  {
    keywords: ["medicina", "medico", "doctor", "farmacia", "salud",
      "drogueria", "clinica", "hospital"],
    emoji: "💊", name: "Salud",
  },
  {
    keywords: ["gym", "gimnasio", "deporte", "futbol", "natacion"],
    emoji: "🏋️", name: "Deporte",
  },
];

// ─── Palabras numéricas en español ───────────────────────────────────────────
const WORD_NUMBERS: Record<string, number> = {
  uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50,
  sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100, doscientos: 200, trescientos: 300,
  cuatrocientos: 400, quinientos: 500, seiscientos: 600,
  setecientos: 700, ochocientos: 800, novecientos: 900,
  mil: 1000,
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function extractAmount(text: string): number {
  const n = normalize(text);

  // "25 mil" | "25mil" → 25000
  const milMatch = n.match(/(\d+[\.,]?\d*)\s*mil/);
  if (milMatch) {
    return parseFloat(milMatch[1].replace(",", ".")) * 1000;
  }

  // "cuarenta y dos mil" → 42000
  let wordAmount = 0;
  let hasWordNumber = false;
  for (const [word, val] of Object.entries(WORD_NUMBERS)) {
    if (n.includes(word)) {
      wordAmount += val;
      hasWordNumber = true;
    }
  }
  if (hasWordNumber && n.includes("mil")) wordAmount *= 1000;
  if (hasWordNumber && wordAmount > 0) return wordAmount;

  // Número directo: "42000", "42.000", "42,000"
  const numMatch = n.match(/\d{1,3}(?:[.,]\d{3})+|\d+[.,]\d+|\d+/);
  if (numMatch) {
    const raw = numMatch[0].replace(/\./g, "").replace(",", ".");
    return parseFloat(raw);
  }

  return 0;
}

function extractDate(text: string): DateOption {
  const n = normalize(text);
  if (/anteayer|antes de ayer/.test(n)) return "daybeforeyesterday";
  if (/\bayer\b/.test(n)) return "yesterday";
  return "today";
}

function extractCategory(text: string): { emoji: string; name: string } {
  const n = normalize(text);
  for (const cat of CATEGORY_MAP) {
    if (cat.keywords.some((kw) => n.includes(kw))) {
      return { emoji: cat.emoji, name: cat.name };
    }
  }
  return { emoji: "💰", name: "General" };
}

function extractNote(text: string): string {
  // Limpia el texto quitando cantidades y palabras de fecha para que quede como descripción
  return text
    .replace(/\d+[\.,]?\d*\s*mil/gi, "")
    .replace(/\b(hoy|ayer|anteayer|manana)\b/gi, "")
    .replace(/\b(gaste|compre|pague|pague|gasto|costo)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ─── Función principal exportada ─────────────────────────────────────────────
export function processVoiceInput(raw: string): Partial<ActiveExpense> {
  const category = extractCategory(raw);
  const note = extractNote(raw) || raw;

  return {
    amount: extractAmount(raw),
    categoryEmoji: category.emoji,
    categoryName: category.name,
    date: extractDate(raw),
    note,
    rawTranscript: raw,
    tags: [],
  };
}
