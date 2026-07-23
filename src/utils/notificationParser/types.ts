/**
 * Tipos compartidos del parser de notificaciones bancarias.
 */

export type ParseConfidence = "high" | "medium" | "low";

/**
 * Clasificación de intención de una notificación, evaluada ANTES de intentar
 * extraer campos de transacción (monto, dirección, descripción).
 *
 * Cada categoría es una razón de descarte explícita y nombrada. Reemplaza al
 * antiguo array plano "NOISE_PATTERNS" donde OTP, alertas de seguridad,
 * publicidad y recordatorios de pago vivían mezclados sin distinción — con
 * esa clasificación mezclada, cada caso nuevo (ej. el recordatorio de pago de
 * Nu que se colaba como gasto real) obligaba a adivinar en qué punto de una
 * lista larga agregar el patrón, sin saber qué otras categorías existían ya.
 */
export type NotificationIntent =
  | "otp" // código de verificación / token de seguridad
  | "security_alert" // cuenta bloqueada/suspendida, intento de acceso
  | "payment_reminder" // invitación a pagar una factura, aún no confirmado
  | "marketing" // publicidad, promociones, cashback
  | "app_update" // avisos de actualización de la app del banco
  | "possible_transaction"; // no matchea ninguna categoría de ruido -> intentar parsear

export interface ParsedTransaction {
  amount: number; // siempre positivo
  isExpense: boolean; // true = gasto, false = ingreso
  description: string; // comercio o descripción limpia
  bankName: string; // nombre del banco
  packageName: string; // app que generó la notificación
  rawTitle: string; // título original (para debugging)
  rawText: string; // texto original (para debugging)
  confidence: ParseConfidence;
  detectedAt: string; // ISO timestamp
}
