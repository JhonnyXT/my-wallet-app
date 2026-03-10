/**
 * voiceParser — convierte texto de voz/texto libre en datos estructurados.
 * 100% offline. Usa las 8 categorías estándar de MyWallet.
 * Devuelve `null` en campos no detectados para no sobreescribir selecciones previas.
 */
import type { ActiveExpense, DateOption } from "@/src/store/useExpenseStore";

// ─── Mapa de las 8 categorías estándar ───────────────────────────────────────
const CATEGORY_MAP: { keywords: string[]; emoji: string; name: string }[] = [
  {
    keywords: [
      "restaurante", "almuerzo", "cena", "desayuno", "mcdonalds",
      "pizza", "burger", "sushi", "comida", "comer", "pollo", "empanada",
      "cafe", "coffee", "starbucks", "tinto", "capuchino", "latte",
      "mercado", "supermercado", "carulla", "jumbo", "exito",
      "tienda", "panaderia",
    ],
    emoji: "🍔", name: "Comida",
  },
  {
    keywords: [
      "uber", "taxi", "bus", "metro", "transporte", "gasolina",
      "combustible", "shuttle", "vuelo", "avion", "tren", "moto", "peaje",
      "parqueadero", "parqueo",
    ],
    emoji: "🚗", name: "Transporte",
  },
  {
    keywords: [
      "arriendo", "alquiler", "luz", "agua", "gas", "internet",
      "servicios", "celular", "telefono", "hogar", "casa", "reparacion",
      "plomero", "electricista",
    ],
    emoji: "🏠", name: "Hogar",
  },
  {
    keywords: [
      "zara", "ropa", "compras", "gadget", "electronico", "celular nuevo",
      "laptop", "tablet", "zapatos", "accesorio",
    ],
    emoji: "🛍️", name: "Compras",
  },
  {
    keywords: [
      "medicina", "medico", "doctor", "farmacia", "salud", "drogueria",
      "clinica", "hospital", "cita", "examen", "vacuna", "eps",
    ],
    emoji: "🏥", name: "Salud",
  },
  {
    keywords: [
      "cine", "netflix", "juego", "entretenimiento", "playstation",
      "xbox", "spotify", "concierto", "pelicula", "serie", "teatro",
      "gym", "gimnasio",
    ],
    emoji: "🎮", name: "Entretenimiento",
  },
  {
    keywords: [
      "curso", "libro", "educacion", "colegio", "universidad",
      "clase", "taller", "seminario", "capacitacion",
    ],
    emoji: "🎓", name: "Educación",
  },
  {
    keywords: [
      "personal", "cuidado", "barberia", "peluqueria", "salon",
      "cosmetico", "belleza", "deporte", "futbol", "natacion",
    ],
    emoji: "👤", name: "Personal",
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

/**
 * Normaliza separadores de miles en un texto: reemplaza comas por puntos
 * en patrones numéricos tipo "$40,000" o "40,000" → "$40.000" / "40.000"
 * para mostrar siempre en formato COP.
 */
export function normalizeMoneyText(text: string): string {
  // Reemplaza números con coma como separador de miles (ej: 40,000 / 1,500,000)
  return text.replace(/(\d{1,3})(,(\d{3}))+/g, (match) =>
    match.replace(/,/g, ".")
  );
}

function extractAmount(text: string): number {
  const n = normalize(text);

  // "25 mil" | "25mil" → 25000
  const milMatch = n.match(/(\d+[\.,]?\d*)\s*\bmil\b/);
  if (milMatch) {
    return parseFloat(milMatch[1].replace(",", ".")) * 1000;
  }

  // "cuarenta y dos mil" → 42000
  // \bmil\b asegura que no haga match con "familia", "similar", etc.
  const hasMilWord = /\bmil\b/.test(n);
  let wordAmount = 0;
  let hasWordNumber = false;
  for (const [word, val] of Object.entries(WORD_NUMBERS)) {
    if (n.includes(word)) {
      wordAmount += val;
      hasWordNumber = true;
    }
  }
  if (hasWordNumber && hasMilWord) wordAmount *= 1000;
  if (hasWordNumber && wordAmount > 0) return wordAmount;

  // Número directo: "42000", "42.000", "42,000", "$40,000"
  const numMatch = n.match(/\d{1,3}(?:[.,]\d{3})+|\d+[.,]\d+|\d+/);
  if (numMatch) {
    const raw = numMatch[0];
    // Formato de miles (ej: "40,000" / "40.000" / "1,500,000"):
    // los separadores son de miles → eliminarlos todos y parsear como entero
    if (/\d{1,3}(?:[.,]\d{3})+/.test(raw)) {
      return parseInt(raw.replace(/[.,]/g, ""), 10);
    }
    // Número decimal o entero simple (ej: "42.5", "42,5", "42000")
    return parseFloat(raw.replace(",", "."));
  }

  return 0;
}

function extractDate(text: string): DateOption | null {
  const n = normalize(text);
  if (/anteayer|antes de ayer/.test(n)) return "daybeforeyesterday";
  if (/\bayer\b/.test(n)) return "yesterday";
  if (/\bhoy\b/.test(n)) return "today";
  return null; // sin mención explícita → no cambiar la fecha seleccionada
}

/** Devuelve la categoría detectada, o null si no hay coincidencia */
function extractCategory(text: string): { emoji: string; name: string } | null {
  const n = normalize(text);
  for (const cat of CATEGORY_MAP) {
    if (cat.keywords.some((kw) => n.includes(kw))) {
      return { emoji: cat.emoji, name: cat.name };
    }
  }
  return null; // sin match → no sobreescribir selección actual
}

// ─── Detecta si es gasto o ingreso ───────────────────────────────────────────
// Devuelve true = gasto, false = ingreso, undefined = no detectado
function extractIsExpense(text: string): boolean | undefined {
  const n = normalize(text);

  const incomeKeywords = [
    "recibi", "recibe", "recibido", "ingrese", "ingreso",
    "me pagaron", "me deposita", "me depositaron",
    "cobre", "cobrado", "cobrar",
    "salario", "sueldo", "nomina",
    "ganancia", "vendi", "venta",
    "me dieron", "me mandaron", "me gane",
  ];
  if (incomeKeywords.some((kw) => n.includes(kw))) return false;

  const expenseKeywords = [
    "gaste", "gasto", "compre", "compra", "pague", "pago",
    "costo", "cuesta",
    "me costo", "me cobro",
    "sali a", "fui a",
  ];
  if (expenseKeywords.some((kw) => n.includes(kw))) return true;

  return undefined;
}

// ─── Función principal exportada ─────────────────────────────────────────────
export function processVoiceInput(raw: string): Partial<ActiveExpense> & {
  _categoryDetected: boolean;
  _dateDetected: boolean;
} {
  const category  = extractCategory(raw);
  const date      = extractDate(raw);
  const isExpense = extractIsExpense(raw);
  const amount    = extractAmount(raw);
  // Normalizar el texto para mostrar puntos en lugar de comas en los montos
  const normalizedRaw = normalizeMoneyText(raw);

  const result: Partial<ActiveExpense> & { _categoryDetected: boolean; _dateDetected: boolean } = {
    amount,
    note:          normalizedRaw,
    rawTranscript: normalizedRaw,
    tags:          [],
    _categoryDetected: category !== null,
    _dateDetected:     date !== null,
  };

  if (category)             { result.categoryEmoji = category.emoji; result.categoryName = category.name; }
  if (date)                   result.date      = date;
  if (isExpense !== undefined) result.isExpense = isExpense;

  return result;
}
