import { localISOString } from "@/src/db/db";
import { KNOWN_BANKS, BANK_PACKAGE_NAMES, type BankConfig } from "@/src/constants/banks";
import { classifyIntent } from "./intentClassifier";
import { BANK_PATTERNS, GENERIC_PATTERN } from "./bankPatterns";
import type { ParsedTransaction } from "./types";

/**
 * Intenta parsear una notificación de app bancaria como transacción.
 * Retorna `null` si:
 *   - el packageName no está en la whitelist
 *   - la notificación se clasifica como ruido (OTP, alerta de seguridad,
 *     recordatorio de pago pendiente, publicidad, actualización de app)
 *   - no se puede extraer un monto válido
 */
export function parseNotification(
  packageName: string,
  title: string,
  text: string,
): ParsedTransaction | null {
  // 1. Verificar whitelist
  if (!BANK_PACKAGE_NAMES.has(packageName)) return null;

  // 2. Obtener config del banco
  const bank = KNOWN_BANKS.find((b) => b.packageName === packageName);
  if (!bank) return null;

  // 3. Clasificar intención — filtra OTP, alertas, recordatorios de pago,
  //    marketing y avisos de actualización ANTES de intentar extraer nada.
  //    Esta clasificación es genérica y corre igual para los 15 bancos de
  //    la whitelist, no solo para el que originó el patrón.
  if (classifyIntent(title, text) !== "possible_transaction") return null;

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
    rawTitle: title.substring(0, 100), // limitado a 100 chars para no almacenar saldos largos
    rawText: text.substring(0, 200), // limitado para privacidad
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
