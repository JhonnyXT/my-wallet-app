/**
 * Casos reales/sintéticos de notificaciones bancarias con el resultado
 * esperado del parser. Sirven hoy para verificación manual (correr con
 * `parseNotification(f.packageName, f.title, f.text)` y comparar contra
 * `f.expected`) y quedan listos para envolverse en `it()`/`test()` uno a
 * uno el día que se configure Jest/Vitest (deuda técnica pendiente,
 * documentada en AGENTS.md).
 *
 * Al ajustar cualquier patrón de intentClassifier/bankPatterns, agregar
 * aquí el caso que motivó el cambio — es la manera más barata de evitar que
 * un fix futuro rompa silenciosamente uno de estos casos.
 */

export type FixtureExpectation =
  | { kind: "filtered" }
  | { kind: "parsed"; amount: number; isExpense: boolean };

export interface NotificationFixture {
  label: string;
  packageName: string;
  title: string;
  text: string;
  expected: FixtureExpectation;
}

export const NOTIFICATION_FIXTURES: NotificationFixture[] = [
  {
    label: "Nu — recordatorio de pago de factura pendiente (NO debe registrarse)",
    packageName: "com.nu.production",
    title: "Tienes un pago por $43.900,00...",
    text: "Completa tu pago de forma fácil y segura en tu app Nu.",
    expected: { kind: "filtered" },
  },
  {
    label: "Nu — compra confirmada (SÍ debe registrarse como gasto)",
    packageName: "com.nu.production",
    title: "Pagaste $12.000",
    text: "Pagaste $12.000 en Éxito",
    expected: { kind: "parsed", amount: 12000, isExpense: true },
  },
  {
    label: "Nequi — transferencia recibida (SÍ debe registrarse como ingreso)",
    packageName: "com.nequi.MobileApp",
    title: "Te enviaron plata",
    text: "Te enviaron $80.000 de Juan Pérez",
    expected: { kind: "parsed", amount: 80000, isExpense: false },
  },
  {
    label: "Bancolombia — compra confirmada (SÍ debe registrarse como gasto)",
    packageName: "co.com.bancolombia.personas.superapp",
    title: "Bancolombia te informa",
    text: "Bancolombia le informa Compra por $45.000 en RAPPI CO.",
    expected: { kind: "parsed", amount: 45000, isExpense: true },
  },
  {
    label: "Davivienda — débito confirmado (SÍ debe registrarse como gasto)",
    packageName: "com.davivienda.daviviendaapp",
    title: "Davivienda",
    text: "Su tarjeta debito realizo una compra Comercio: NETFLIX $38.900",
    expected: { kind: "parsed", amount: 38900, isExpense: true },
  },
  {
    label: "OTP genérico (NO debe registrarse)",
    packageName: "co.com.bancolombia.personas.superapp",
    title: "Código de verificación",
    text: "123456 es tu código de verificación, no lo compartas con nadie.",
    expected: { kind: "filtered" },
  },
  {
    label: "Alerta de seguridad (NO debe registrarse)",
    packageName: "com.nu.production",
    title: "Alerta de seguridad",
    text: "Detectamos un intento de acceso desde un dispositivo nuevo.",
    expected: { kind: "filtered" },
  },
  {
    label: "Marketing/promo (NO debe registrarse)",
    packageName: "com.nu.production",
    title: "¡Oferta especial!",
    text: "Obtén cashback del 5% en tus compras esta semana.",
    expected: { kind: "filtered" },
  },
  {
    label: "Recordatorio de factura genérico, sin mencionar el banco (NO debe registrarse)",
    packageName: "com.davivienda.daviviendaapp",
    title: "Recuerda tu factura",
    text: "Tu factura de servicios públicos está pendiente. Recuerda pagar antes de que venza.",
    expected: { kind: "filtered" },
  },
];
