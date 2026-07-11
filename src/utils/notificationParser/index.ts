/**
 * notificationParser — parsea notificaciones push de apps bancarias
 * colombianas para extraer transacciones estructuradas (monto, tipo,
 * descripción, banco).
 *
 * Principios de privacidad:
 * - Solo se extrae monto, tipo y descripción del comercio.
 * - Saldo disponible, últimos dígitos de tarjeta y datos personales son descartados.
 * - Solo se procesa si el packageName está en la whitelist de bancos conocidos.
 *
 * Arquitectura (un módulo por responsabilidad, para que agregar un banco o
 * ajustar un patrón no obligue a leer/tocar los demás):
 *   types.ts                 — tipos compartidos (ParsedTransaction, NotificationIntent...)
 *   intentClassifier.ts      — descarta OTP/alertas/recordatorios de pago/marketing ANTES de parsear
 *   amountExtractor.ts       — extrae el monto en COP del texto
 *   directionClassifier.ts   — decide gasto vs ingreso
 *   descriptionExtractor.ts  — limpia el texto para dejar solo la descripción
 *   bankPatterns.ts          — un patrón por banco (o el genérico) que combina lo anterior
 *   parseNotification.ts     — orquesta el pipeline completo (API pública)
 *   fixtures.ts              — casos reales/sintéticos con resultado esperado,
 *                              para verificación manual hoy y para envolver en
 *                              tests automáticos cuando se configure un test
 *                              runner (deuda técnica pendiente, ver AGENTS.md)
 */

export { parseNotification, getBankConfig } from "./parseNotification";
export { classifyIntent } from "./intentClassifier";
export type { ParsedTransaction, ParseConfidence, NotificationIntent } from "./types";

// Re-exportados para no romper a los consumidores que ya importaban estos
// símbolos desde "@/src/utils/notificationParser" en vez de "@/src/constants/banks".
export { KNOWN_BANKS, BANK_PACKAGE_NAMES } from "@/src/constants/banks";
export type { BankConfig } from "@/src/constants/banks";
