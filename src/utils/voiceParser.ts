/**
 * voiceParser — convierte texto de voz/texto libre en datos estructurados.
 * 100% offline. Usa las 8 categorías de gastos + 5 de ingresos de MyWallet.
 * Devuelve `null` en campos no detectados para no sobreescribir selecciones previas.
 */
import type { ActiveExpense, DateOption } from "@/src/store/useExpenseStore";

// ─── Mapa de categorías (gastos + ingresos) ───────────────────────────────────
const CATEGORY_MAP: { keywords: string[]; emoji: string; name: string }[] = [
  // ── Gastos ──────────────────────────────────────────────────────────────────
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
  // ── Ingresos ─────────────────────────────────────────────────────────────────
  {
    keywords: [
      "salario", "nomina", "sueldo", "quincena", "mensualidad",
      "pago empresa", "pago del trabajo",
    ],
    emoji: "💼", name: "Salario",
  },
  {
    keywords: [
      "freelance", "proyecto", "honorarios", "consultoria", "contrato",
      "servicio prestado",
    ],
    emoji: "💻", name: "Freelance",
  },
  {
    keywords: [
      "inversion", "dividendos", "intereses", "rendimientos", "acciones", "cripto",
    ],
    emoji: "📈", name: "Inversiones",
  },
  {
    keywords: [
      "regalo", "bono", "reembolso", "devolucion", "venta", "comision",
      "cashback",
    ],
    emoji: "🎁", name: "Extra",
  },
  {
    keywords: [
      "negocio", "facturacion", "cobro del negocio", "venta del negocio",
    ],
    emoji: "🏢", name: "Negocio",
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
  return text.replace(/(\d{1,3})(,(\d{3}))+/g, (match) =>
    match.replace(/,/g, ".")
  );
}

/**
 * Reemplaza la expresión de dinero en el texto (palabras o dígitos) por
 * la cifra formateada en COP. Ejemplo:
 *   "cinco millones 400.000 por la empresa" → "$5.400.000 por la empresa"
 *   "gasté 40 mil en comida" → "gasté $40.000 en comida"
 */
export function replaceAmountInNote(raw: string, amount: number): string {
  if (amount <= 0) return raw;
  const formatted = `$${Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

  const patterns = [
    // "5 millones 400.000" / "5 millones 400 mil" / "5 millones 400" / "5 millones"
    /\$?\s*\d+(?:[.,]\d+)?\s*millones?\s*(?:\d+(?:[.,]\d+)?\s*(?:mil(?:es)?)?)?/i,
    // "cinco millones 400" / "dos millones" etc. (palabra + millones + opcional miles)
    /\b(?:un|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\s+millones?\s*(?:\d+(?:[.,]\d+)?\s*(?:mil(?:es)?)?)?/i,
    // "cuatrocientos mil" / "25 mil" / "veinticinco mil"
    /\$?\s*(?:\d+(?:[.,]\d+)?|(?:cien|doscientos|trescientos|cuatrocientos|quinientos|seiscientos|setecientos|ochocientos|novecientos))\s*\bmil\b/i,
    // "$40.000" / "$40,000" / números grandes formateados
    /\$?\s*\d{1,3}(?:[.,]\d{3})+/,
    // Número largo sin formato: "40000"
    /\$?\s*\d{5,}/,
  ];

  for (const pattern of patterns) {
    if (pattern.test(raw)) {
      let result = raw.replace(pattern, formatted);
      result = result.replace(/([a-záéíóúñA-ZÁÉÍÓÚÑ])\$/g, "$1 $");
      return result;
    }
  }
  return raw;
}

function extractAmount(text: string): number {
  const n = normalize(text);

  // Helper: busca una palabra con límites de palabra para evitar
  // falsos positivos como "mil" dentro de "millones" o "familia"
  const hasWordBound = (word: string) =>
    new RegExp(`\\b${word}\\b`).test(n);

  // Helper: extrae miles adicionales después de "millones"
  // "5 millones 400" → 400.000   "5 millones 400 mil" → 400.000
  function extraAfterMillones(rest: string): number {
    const explicitMil = rest.match(/(\d+)\s*\bmil\b/);
    if (explicitMil) return parseInt(explicitMil[1]) * 1000;
    // Patrón colombiano: número 1-999 después de "millones" implica miles
    const implicitNum = rest.match(/\b(\d{1,3})\b/);
    if (implicitNum) {
      const v = parseInt(implicitNum[1]);
      if (v > 0) return v * 1000;
    }
    return 0;
  }

  // ── 1. MILLONES (dígitos) ─────────────────────────────────────────────────
  // "5 millones"  /  "5 millones 400"  /  "5 millones 400 mil"
  const millonNumMatch = n.match(/(\d+(?:[.,]\d+)?)\s*\bmillones?\b/);
  if (millonNumMatch) {
    const base = parseFloat(millonNumMatch[1].replace(",", ".")) * 1_000_000;
    const after = n.slice(
      n.indexOf(millonNumMatch[0]) + millonNumMatch[0].length
    );
    return base + extraAfterMillones(after);
  }

  // ── 2. MILLONES (palabras) ────────────────────────────────────────────────
  // "cinco millones 400"  /  "dos millones"  /  "un millón"
  const hasMillonesWord = /\bmillones?\b/.test(n);
  if (hasMillonesWord) {
    let wordMillions = 0;
    if (/\bun\b/.test(n)) wordMillions = 1;
    for (const [word, val] of Object.entries(WORD_NUMBERS)) {
      if (val >= 1 && val <= 900 && hasWordBound(word)) {
        // Solo aplica si aparece antes de "millones"
        const wIdx = n.search(new RegExp(`\\b${word}\\b`));
        const mIdx = n.search(/\bmillones?\b/);
        if (wIdx < mIdx) { wordMillions = val; break; }
      }
    }
    if (wordMillions > 0) {
      const mIdx = n.search(/\bmillones?\b/);
      const mWord = n.match(/\bmillones?\b/)![0];
      const after = n.slice(mIdx + mWord.length);
      return wordMillions * 1_000_000 + extraAfterMillones(after);
    }
  }

  // ── 3. MIL (dígitos) ──────────────────────────────────────────────────────
  // "25 mil" → 25.000
  const milNumMatch = n.match(/(\d+[\.,]?\d*)\s*\bmil\b/);
  if (milNumMatch) {
    return parseFloat(milNumMatch[1].replace(",", ".")) * 1000;
  }

  // ── 4. MIL (palabras) ─────────────────────────────────────────────────────
  // "cuarenta y dos mil" → 42.000
  // Se usa \b para evitar que "mil" dentro de "millones" o "familia" sume.
  const hasMilWord = hasWordBound("mil");
  let wordAmount = 0;
  let hasWordNumber = false;
  for (const [word, val] of Object.entries(WORD_NUMBERS)) {
    if (word === "mil") continue;          // "mil" se maneja por separado
    if (hasWordBound(word)) {
      wordAmount += val;
      hasWordNumber = true;
    }
  }
  if (hasWordNumber && hasMilWord) wordAmount *= 1000;
  else if (!hasWordNumber && hasMilWord) wordAmount = 1000;
  if ((hasWordNumber || hasMilWord) && wordAmount > 0) return wordAmount;

  // ── 5. NÚMERO DIRECTO ─────────────────────────────────────────────────────
  // "42000"  /  "42.000"  /  "42,000"  /  "$40,000"
  const numMatch = n.match(/\d{1,3}(?:[.,]\d{3})+|\d+[.,]\d+|\d+/);
  if (numMatch) {
    const raw = numMatch[0];
    if (/\d{1,3}(?:[.,]\d{3})+/.test(raw)) {
      return parseInt(raw.replace(/[.,]/g, ""), 10);
    }
    return parseFloat(raw.replace(",", "."));
  }

  return 0;
}

function extractDate(text: string): DateOption | null {
  const n = normalize(text);
  if (/\bhoy\b/.test(n)) return "today";
  return null;
}

/** Devuelve la categoría detectada. Consulta primero userCategories si se proveen. */
function extractCategory(text: string, userCats?: import("@/src/constants/categoryPresets").UserCategory[]): { emoji: string; name: string } | null {
  const n = normalize(text);
  if (userCats) {
    for (const cat of userCats) {
      if (cat.keywords.some((kw) => n.includes(kw))) {
        return { emoji: cat.emoji, name: cat.name };
      }
    }
  }
  for (const cat of CATEGORY_MAP) {
    if (cat.keywords.some((kw) => n.includes(kw))) {
      return { emoji: cat.emoji, name: cat.name };
    }
  }
  return null;
}

// ─── Detecta si es gasto o ingreso ───────────────────────────────────────────
// Devuelve true = gasto, false = ingreso, undefined = no detectado
function extractIsExpense(text: string): boolean | undefined {
  const n = normalize(text);

  const incomeKeywords = [
    "recibi", "recibe", "recibido", "ingrese", "ingreso",
    "me pagaron", "me deposita", "me depositaron",
    "cobre", "cobrado", "cobrar",
    "salario", "sueldo", "nomina", "quincena", "mensualidad",
    "ganancia", "vendi", "venta",
    "me dieron", "me mandaron", "me gane",
    "freelance", "honorarios", "consultoria", "proyecto pagado",
    "dividendos", "rendimientos", "intereses",
    "reembolso", "devolucion", "bono",
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

// ─── Detección de múltiples montos ───────────────────────────────────────────

/**
 * Encuentra los rangos (start, end) de todas las expresiones monetarias
 * distintas en el texto normalizado. Orden de prioridad: millones > mil > formateado > largo.
 */
function findAmountSpans(text: string): Array<{ start: number; end: number }> {
  const n = normalize(text);
  const spans: Array<{ start: number; end: number }> = [];

  const AMOUNT_RE =
    /\d+(?:[.,]\d+)?\s*millones?(?:\s+\d+(?:[.,]\d*)?\s*(?:mil(?:es)?)?)?\s*|\d+(?:[.,]\d*)?\s*\bmil\b|\d{1,3}(?:[.,]\d{3})+|\b\d{4,}\b/g;

  let m;
  while ((m = AMOUNT_RE.exec(n)) !== null) {
    const span = { start: m.index, end: m.index + m[0].trimEnd().length };
    const overlaps = spans.some(
      (s) => span.start < s.end && span.end > s.start
    );
    if (!overlaps) spans.push(span);
  }
  return spans;
}

/**
 * Divide el texto en segmentos, uno por transacción detectada.
 * Busca conjunciones ("y", "también", "además", "luego") entre los montos
 * consecutivos para determinar el punto de corte.
 */
function splitIntoSegments(text: string): string[] {
  const spans = findAmountSpans(text);
  if (spans.length <= 1) return [text];

  const splitPoints: number[] = [];
  for (let i = 0; i < spans.length - 1; i++) {
    const between = text.slice(spans[i].end, spans[i + 1].start);
    const conjMatch =
      /\s+(?:y\s+(?:también\s+|además\s+)?|también\s+|además\s+|luego\s+|después\s+)/i.exec(
        between
      );
    if (conjMatch) {
      splitPoints.push(spans[i].end + conjMatch.index);
    } else {
      // Sin conjunción explícita: el corte es en el inicio del siguiente monto
      splitPoints.push(spans[i + 1].start);
    }
  }

  const segments: string[] = [];
  let cursor = 0;
  for (const sp of splitPoints) {
    const seg = text.slice(cursor, sp).trim();
    if (seg.length > 0) segments.push(seg);
    cursor = sp;
  }
  const last = text.slice(cursor).trim();
  if (last.length > 0) segments.push(last);
  return segments;
}

// ─── Función principal exportada ─────────────────────────────────────────────
export function processVoiceInput(raw: string, userCats?: import("@/src/constants/categoryPresets").UserCategory[]): Partial<ActiveExpense> & {
  _categoryDetected: boolean;
  _dateDetected: boolean;
} {
  const category  = extractCategory(raw, userCats);
  const date      = extractDate(raw);
  const isExpense = extractIsExpense(raw);
  const amount    = extractAmount(raw);
  // Normalizar texto y convertir expresión de dinero textual a dígitos formateados
  const normalizedRaw = normalizeMoneyText(raw);
  const cleanNote     = replaceAmountInNote(normalizedRaw, amount);

  const result: Partial<ActiveExpense> & { _categoryDetected: boolean; _dateDetected: boolean } = {
    amount,
    note:          cleanNote,
    rawTranscript: cleanNote,
    tags:          [],
    _categoryDetected: category !== null,
    _dateDetected:     date !== null,
  };

  if (category)             { result.categoryEmoji = category.emoji; result.categoryName = category.name; }
  if (date)                   result.date      = date;
  if (isExpense !== undefined) result.isExpense = isExpense;

  return result;
}

// ─── Multi-transacción ────────────────────────────────────────────────────────

type SingleResult = ReturnType<typeof processVoiceInput>;

export type MultiVoiceResult =
  | { multiple: false; single: SingleResult }
  | { multiple: true; transactions: SingleResult[] };

/**
 * Detecta si el transcript contiene múltiples transacciones (varios montos).
 * Si hay 2+ montos distintos, divide el texto en segmentos y procesa cada uno.
 * Los segmentos sin tipo explícito (gasto/ingreso) heredan el del primer segmento.
 *
 * Ejemplo:
 *   "gasté treinta mil en almuerzo y quince mil en café y veinte mil en taxi"
 *   → 3 transacciones de gasto
 */
export function processMultiVoiceInput(
  raw: string,
  userCats?: import("@/src/constants/categoryPresets").UserCategory[]
): MultiVoiceResult {
  const spans = findAmountSpans(raw);

  // Un solo monto → flujo estándar
  if (spans.length <= 1) {
    return { multiple: false, single: processVoiceInput(raw, userCats) };
  }

  const segments = splitIntoSegments(raw);

  // Parsear cada segmento de forma independiente
  const parsed = segments.map((seg) => processVoiceInput(seg, userCats));

  // Herencia de tipo: si el primer segmento tiene isExpense definido,
  // los segmentos sin tipo explícito lo heredan
  const firstType = parsed[0].isExpense;
  const transactions = parsed.map((t) => ({
    ...t,
    isExpense: t.isExpense !== undefined ? t.isExpense : firstType,
  }));

  // Descartar segmentos sin monto válido
  const valid = transactions.filter((t) => (t.amount ?? 0) > 0);

  if (valid.length <= 1) {
    return { multiple: false, single: processVoiceInput(raw, userCats) };
  }

  return { multiple: true, transactions: valid };
}
