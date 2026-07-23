import type { NotificationIntent } from "./types";

/**
 * Reglas de clasificación de intención, en orden de prioridad: la primera
 * categoría cuyo patrón matchee gana. El orden importa (ej. un OTP nunca
 * debería poder clasificarse como recordatorio de pago) — por eso las reglas
 * más específicas/peligrosas de confundir van primero.
 *
 * Para agregar un caso nuevo: identificar a cuál de estas 5 categorías
 * pertenece semánticamente y sumar el patrón ahí. Solo crear una categoría
 * nueva si el tipo de notificación es genuinamente distinto a los que ya
 * existen — no agregar categorías por cada banco.
 */
const INTENT_RULES: readonly { intent: NotificationIntent; patterns: RegExp[] }[] = [
  {
    intent: "otp",
    patterns: [
      /ingresa.{0,15}c[oó]digo/i, // "Ingresa el código"
      /c[oó]digo.{0,10}verifica/i, // "código de verificación"
      /(\d{4,8})\s+es tu c[oó]digo/i, // "123456 es tu código"
      /token/i, // Token de seguridad
    ],
  },
  {
    intent: "security_alert",
    patterns: [
      /intento de (inicio|acceso)/i, // Alerta de seguridad
      /bloqueada|suspendida|desactivada/i, // Alerta de cuenta
    ],
  },
  {
    intent: "payment_reminder",
    patterns: [
      // Invitaciones a completar un pago de factura — todavía NO son
      // transacciones confirmadas. Genérico para todos los bancos (se
      // detectó originalmente en Nu: "Tienes un pago por $X. Completa tu
      // pago de forma fácil y segura en tu app Nu." para una factura de
      // servicios que el usuario aún no había pagado).
      /tienes\s+un\s+pago\s+(pendiente|por)/i,
      /completa\s+tu\s+pago/i,
      /finaliza\s+tu\s+(pago|compra)/i,
      /contin[uú]a\s+tu\s+(pago|compra)/i,
      /realiza\s+tu\s+pago/i,
      /pago\s+pendiente/i,
      /no\s+has\s+(completado|finalizado|terminado)/i,
      /recuerda\s+(completar|pagar|tu\s+pago|tu\s+factura)/i,
      /factura\s+(pendiente|por\s+vencer)/i,
      /vence\s+(hoy|mañana|pronto)/i,
      /paga\s+(f[aá]cil|ahora|tu\s+factura)/i,
    ],
  },
  {
    intent: "marketing",
    patterns: [/descuento|promo|oferta|cashback/i],
  },
  {
    intent: "app_update",
    patterns: [/tienes.{0,20}nuevo.{0,20}(mensaje|notificaci)/i, /actualiza.{0,20}app/i],
  },
];

/**
 * Clasifica la intención de una notificación bancaria. Si no matchea
 * ninguna categoría de ruido conocida, se asume "possible_transaction" y el
 * llamador procede a intentar extraer los campos de la transacción.
 */
export function classifyIntent(title: string, text: string): NotificationIntent {
  const combined = `${title} ${text}`;
  for (const rule of INTENT_RULES) {
    if (rule.patterns.some((p) => p.test(combined))) return rule.intent;
  }
  return "possible_transaction";
}
