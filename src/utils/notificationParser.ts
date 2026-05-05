/**
 * notificationParser.ts
 * Parsea notificaciones push de apps bancarias colombianas para extraer
 * transacciones estructuradas (monto, tipo, descripción, banco).
 *
 * Principios de privacidad:
 * - Solo se extrae monto, tipo y descripción del comercio.
 * - Saldo disponible, últimos dígitos de tarjeta y datos personales son descartados.
 * - Solo se procesa si el packageName está en la whitelist de bancos conocidos.
 */

import { localISOString } from "@/src/db/db";

// ─── Whitelist de apps bancarias colombianas ──────────────────────────────────

export interface BankConfig {
  packageName: string;
  displayName: string;
}

export const KNOWN_BANKS: BankConfig[] = [
  { packageName: "co.com.bancolombia.personas.superapp", displayName: "Bancolombia" },
  { packageName: "com.nequi.MobileApp",                  displayName: "Nequi" },
  { packageName: "com.davivienda.daviviendaapp",         displayName: "Davivienda" },
  { packageName: "com.davivienda.daviplataapp",          displayName: "DaviPlata" },
  { packageName: "co.com.bbva.mb",                       displayName: "BBVA" },
  { packageName: "com.grupoavaloc1.bancamovil",          displayName: "Bco. Occidente" },
  { packageName: "com.grupoavalpo.bancamovil",           displayName: "Bco. Popular" },
  { packageName: "com.grupoavalav1.bancamovil",          displayName: "AV Villas" },
  { packageName: "com.nu.production",                    displayName: "Nu" },
  { packageName: "co.com.lulobank.production",           displayName: "Lulo Bank" },
  { packageName: "eu.netinfo.colpatria.system",          displayName: "Scotiabank Colpatria" },
  { packageName: "com.grability.rappi",                  displayName: "Rappi" },
  { packageName: "co.tpaga.wallet",                      displayName: "Tpaga" },
  { packageName: "com.bancodebogota.bancamovil",         displayName: "Bco. Bogotá" },
  { packageName: "com.co.app.unica.latam",               displayName: "Itaú" },
];

export const BANK_PACKAGE_NAMES = new Set(KNOWN_BANKS.map((b) => b.packageName));

// ─── Resultado del parser ─────────────────────────────────────────────────────

export type ParseConfidence = "high" | "medium" | "low";

export interface ParsedTransaction {
  amount: number;           // siempre positivo
  isExpense: boolean;       // true = gasto, false = ingreso
  description: string;      // comercio o descripción limpia
  bankName: string;         // nombre del banco
  packageName: string;      // app que generó la notificación
  rawTitle: string;         // título original (para debugging)
  rawText: string;          // texto original (para debugging)
  confidence: ParseConfidence;
  detectedAt: string;       // ISO timestamp
}

// ─── Helpers de extracción de monto ──────────────────────────────────────────

/**
 * Extrae el primer monto en COP que encuentre en el texto.
 * Soporta: $1.000 · $1,000 · $1000 · 1.000 · 1,000 · 1000
 */
function extractAmount(text: string): number | null {
  // Patrones de mayor a menor especificidad
  const patterns = [
    // "$200.000,00" o "$1.234.567,00" — formato COP con decimales (Nu, Itaú)
    /\$\s*([\d]{1,3}(?:\.[\d]{3})+),\d{2}\b/,
    // "$1.234.567" o "$1,234,567" — con símbolo y separadores
    /\$\s*([\d]{1,3}(?:[.,][\d]{3})+)/,
    // "$45000" — con símbolo sin separadores
    /\$\s*(\d{4,})/,
    // "200.000,00" — sin símbolo pero con decimales
    /\b(\d{1,3}(?:\.\d{3})+),\d{2}\b/,
    // "45.000" o "45,000" — sin símbolo, con separadores de miles
    /\b(\d{1,3}(?:[.,]\d{3})+)\b/,
    // "45000" — sin símbolo ni separadores (>= 4 dígitos)
    /\b(\d{5,})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Normalizar: quitar puntos de miles y comas
      const raw = match[1].replace(/\./g, "").replace(/,/g, "");
      const value = parseInt(raw, 10);
      if (value > 0) return value;
    }
  }
  return null;
}

/**
 * Determina si la transacción es un gasto o un ingreso.
 * Primero revisa palabras clave explícitas, luego usa el contexto.
 */
function extractIsExpense(text: string): { isExpense: boolean; confidence: "high" | "medium" } {
  const n = text.toLowerCase();

  // Palabras explícitas de gasto
  const expenseKeywords = [
    "compra", "compró", "débito", "debito", "debitado", "debitada", "pago", "pagó",
    "pagaste", "retiro", "retiró", "cargo", "cargado", "cobro", "cobrado",
    "transacción débito", "transaccion debito", "enviaste", "enviaron a",
    "transferencia enviada", "salida",
  ];

  // Palabras explícitas de ingreso
  const incomeKeywords = [
    "recibiste", "recibió", "recibido", "ingreso", "abono", "consignación",
    "consignacion", "depósito", "deposito", "transferencia recibida",
    "llegaron", "te enviaron", "te enviaron", "transferencia entrante",
    "crédito", "credito", "entrada",
  ];

  for (const kw of incomeKeywords) {
    if (n.includes(kw)) return { isExpense: false, confidence: "high" };
  }
  for (const kw of expenseKeywords) {
    if (n.includes(kw)) return { isExpense: true, confidence: "high" };
  }

  // Heurística: si menciona un comercio conocido → probablemente gasto
  return { isExpense: true, confidence: "medium" };
}

/**
 * Extrae una descripción limpia del texto de la notificación.
 * Elimina: montos, saldos, fechas, "Bancolombia le informa", etc.
 */
function extractDescription(text: string, bankName: string): string {
  let clean = text
    // Eliminar prefijos genéricos de bancos
    .replace(/bancolombia le informa/i, "")
    .replace(/su (cuenta|tarjeta) (fue |ha sido )?/i, "")
    .replace(/transacci[oó]n (aprobada|rechazada|exitosa)?/i, "")
    // Eliminar monto + contexto de saldo
    .replace(/\$[\d.,]+/g, "")
    .replace(/saldo[\s:]*[\d.,]+/gi, "")
    .replace(/saldo disponible[\s:]*[\d.,]+/gi, "")
    // Eliminar fechas
    .replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, "")
    .replace(/\d{1,2}:\d{2}(:\d{2})?\s*(a\.?m\.?|p\.?m\.?)?/gi, "")
    // Limpiar espacios múltiples
    .replace(/\s{2,}/g, " ")
    .trim();

  // Si quedó muy corto o vacío, usar el nombre del banco
  if (clean.length < 4) clean = `${bankName}`;

  // Capitalizar primera letra
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

// ─── Patrones específicos por banco ──────────────────────────────────────────

interface BankPattern {
  /** Valida si este patrón aplica a la notificación */
  matches: (title: string, text: string) => boolean;
  /** Extrae los campos necesarios */
  parse: (title: string, text: string, bank: BankConfig) => Partial<ParsedTransaction> | null;
}

const BANCOLOMBIA_PATTERN: BankPattern = {
  matches: (_, text) =>
    /(\$[\d.,]+|débito|debito|compra|retiro|transferencia|recibiste)/i.test(text),
  parse: (_, text, bank) => {
    const amount = extractAmount(text);
    if (!amount) return null;
    const { isExpense, confidence } = extractIsExpense(text);
    // "Compra $45.000 en RAPPI CO." → descripción = "RAPPI CO."
    const enMatch = text.match(/\ben\s+([A-ZÁÉÍÓÚa-záéíóú0-9\s.,*&/-]{2,40}?)(?:\.|$|\s+saldo)/i);
    const description = enMatch
      ? enMatch[1].trim()
      : extractDescription(text, bank.displayName);
    return { amount, isExpense, description, confidence };
  },
};

const NEQUI_PATTERN: BankPattern = {
  matches: (_, text) =>
    /(recibiste|enviaste|pagaste|te enviaron|llegaron|\$[\d.,]+)/i.test(text),
  parse: (title, text, bank) => {
    const amount = extractAmount(text) ?? extractAmount(title);
    if (!amount) return null;
    const { isExpense, confidence } = extractIsExpense(text + " " + title);
    // "Pagaste $12.000 en Éxito" → descripción = "Éxito"
    const enMatch = (text + " " + title).match(/\ben\s+([A-ZÁÉÍÓÚa-záéíóú0-9\s.,*&/-]{2,40}?)(?:\.|$)/i);
    // "Te enviaron $80.000 de Juan Pérez" → descripción = "Juan Pérez"
    const deMatch = text.match(/\bde\s+([A-ZÁÉÍÓÚ][a-záéíóú]+(?:\s+[A-ZÁÉÍÓÚ][a-záéíóú]+)?)/);
    const description = enMatch
      ? enMatch[1].trim()
      : deMatch
      ? deMatch[1].trim()
      : extractDescription(text, bank.displayName);
    return { amount, isExpense, description, confidence };
  },
};

const DAVIVIENDA_PATTERN: BankPattern = {
  matches: (_, text) =>
    /(débito|debito|crédito|credito|comercio|retiro|\$[\d.,]+)/i.test(text),
  parse: (_, text, bank) => {
    const amount = extractAmount(text);
    if (!amount) return null;
    const { isExpense, confidence } = extractIsExpense(text);
    // "Comercio: NETFLIX" → descripción = "Netflix"
    const comercioMatch = text.match(/comercio[:\s]+([A-ZÁÉÍÓÚa-záéíóú0-9\s.,*&/-]{2,40}?)(?:\s+saldo|\.|$)/i);
    const description = comercioMatch
      ? comercioMatch[1].trim()
      : extractDescription(text, bank.displayName);
    return { amount, isExpense, description, confidence };
  },
};

const NU_PATTERN: BankPattern = {
  matches: (title, text) =>
    /(enviaste|recibiste|pagaste|compra|transferencia|\$[\d.,]+)/i.test(title + " " + text),
  parse: (title, text, bank) => {
    const combined = title + " " + text;
    const amount = extractAmount(combined);
    if (!amount) return null;
    const { isExpense, confidence } = extractIsExpense(combined);
    // "Le enviaste a JON******* BLA******* en su cuenta de Nequi" → "Transferencia a Nequi"
    const cuentaMatch = combined.match(/en su cuenta de\s+(\w+)/i);
    // "Pagaste en TIENDA XYZ" → "TIENDA XYZ"
    const enMatch = combined.match(/(?:pagaste|compra)\s+(?:en\s+)?([A-ZÁÉÍÓÚa-záéíóú0-9\s.,*&/-]{2,40}?)(?:\.|$|\s+por)/i);
    // "Le enviaste a JON..." → simplificar como transferencia
    const envioMatch = combined.match(/enviaste a\s+([A-ZÁÉÍÓÚ][A-Za-záéíóú*]+)/i);
    let description: string;
    if (cuentaMatch) {
      description = `Transferencia a ${cuentaMatch[1]}`;
    } else if (enMatch) {
      description = enMatch[1].trim();
    } else if (envioMatch) {
      description = `Envío a ${envioMatch[1].replace(/\*+/g, "").trim()}`;
    } else {
      description = extractDescription(combined, bank.displayName);
    }
    return { amount, isExpense, description, confidence };
  },
};

const GENERIC_PATTERN: BankPattern = {
  matches: (_, text) => /\$[\d.,]+/.test(text),
  parse: (title, text, bank) => {
    const amount = extractAmount(text) ?? extractAmount(title);
    if (!amount) return null;
    const { isExpense } = extractIsExpense(text + " " + title);
    const description = extractDescription(text || title, bank.displayName);
    return { amount, isExpense, description, confidence: "medium" };
  },
};

// Mapa de patrones por packageName (los que tienen patrón específico)
const BANK_PATTERNS: Record<string, BankPattern> = {
  "co.com.bancolombia.personas.superapp": BANCOLOMBIA_PATTERN,
  "com.nequi.MobileApp":                  NEQUI_PATTERN,
  "com.davivienda.daviviendaapp":         DAVIVIENDA_PATTERN,
  "com.davivienda.daviplataapp":          DAVIVIENDA_PATTERN,
  "com.nu.production":                    NU_PATTERN,
};

// ─── Función principal exportada ─────────────────────────────────────────────

/**
 * Intenta parsear una notificación de app bancaria como transacción.
 * Retorna `null` si:
 *   - el packageName no está en la whitelist
 *   - no se puede extraer un monto válido
 *   - la notificación parece un OTP, alerta de seguridad o publicidad
 */
export function parseNotification(
  packageName: string,
  title: string,
  text: string
): ParsedTransaction | null {
  // 1. Verificar whitelist
  if (!BANK_PACKAGE_NAMES.has(packageName)) return null;

  // 2. Obtener config del banco
  const bank = KNOWN_BANKS.find((b) => b.packageName === packageName);
  if (!bank) return null;

  // 3. Filtrar notificaciones que NO son transacciones
  const combined = `${title} ${text}`.toLowerCase();
  const NOISE_PATTERNS = [
    /ingresa.{0,15}c[oó]digo/i,        // OTP: "Ingresa el código"
    /c[oó]digo.{0,10}verifica/i,       // OTP: "código de verificación"
    /(\d{4,8})\s+es tu c[oó]digo/i,    // OTP: "123456 es tu código"
    /token/i,                           // Token de seguridad
    /intento de (inicio|acceso)/i,      // Alerta de seguridad
    /bloqueada|suspendida|desactivada/i,// Alerta de cuenta
    /tienes.{0,20}nuevo.{0,20}(mensaje|notificaci)/i, // Mensajes
    /actualiza.{0,20}app/i,             // Actualización de app
    /descuento|promo|oferta|cashback/i, // Publicidad
  ];

  if (NOISE_PATTERNS.some((p) => p.test(combined))) return null;

  // 4. Obtener patrón específico del banco o el genérico
  const pattern = BANK_PATTERNS[packageName] ?? GENERIC_PATTERN;

  // 5. Validar que el patrón aplica
  if (!pattern.matches(title, text)) return null;

  // 6. Parsear
  const result = pattern.parse(title, text, bank);
  if (!result || !result.amount || result.amount <= 0) return null;

  // 7. Armar el objeto final (sin datos sensibles)
  return {
    amount: result.amount,
    isExpense: result.isExpense ?? true,
    description: (result.description ?? bank.displayName).substring(0, 80),
    bankName: bank.displayName,
    packageName,
    rawTitle: title.substring(0, 100),    // limitado a 100 chars para no almacenar saldos largos
    rawText: text.substring(0, 200),      // limitado para privacidad
    confidence: result.confidence ?? "medium",
    detectedAt: localISOString(),
  };
}

/**
 * Devuelve el BankConfig para un packageName dado, o undefined si no está en la whitelist.
 */
export function getBankConfig(packageName: string): BankConfig | undefined {
  return KNOWN_BANKS.find((b) => b.packageName === packageName);
}
