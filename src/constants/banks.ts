/**
 * Lista de apps bancarias colombianas reconocidas por el parser de notificaciones.
 * Agregar un banco nuevo aquí es suficiente; no se requiere modificar la lógica del parser.
 */

export interface BankConfig {
  packageName: string;
  displayName: string;
}

export const KNOWN_BANKS: BankConfig[] = [
  { packageName: "com.google.android.apps.walletnfcrel", displayName: "Google Wallet" },
  { packageName: "co.com.bancolombia.personas.superapp", displayName: "Bancolombia" },
  { packageName: "com.nequi.MobileApp", displayName: "Nequi" },
  { packageName: "com.davivienda.daviviendaapp", displayName: "Davivienda" },
  { packageName: "com.davivienda.daviplataapp", displayName: "DaviPlata" },
  { packageName: "co.com.bbva.mb", displayName: "BBVA" },
  { packageName: "com.grupoavaloc1.bancamovil", displayName: "Bco. Occidente" },
  { packageName: "com.grupoavalpo.bancamovil", displayName: "Bco. Popular" },
  { packageName: "com.grupoavalav1.bancamovil", displayName: "AV Villas" },
  { packageName: "com.nu.production", displayName: "Nu" },
  { packageName: "co.com.lulobank.production", displayName: "Lulo Bank" },
  { packageName: "eu.netinfo.colpatria.system", displayName: "Scotiabank Colpatria" },
  { packageName: "com.grability.rappi", displayName: "Rappi" },
  { packageName: "co.tpaga.wallet", displayName: "Tpaga" },
  { packageName: "com.bancodebogota.bancamovil", displayName: "Bco. Bogotá" },
  { packageName: "com.co.app.unica.latam", displayName: "Itaú" },
];

export const BANK_PACKAGE_NAMES = new Set(KNOWN_BANKS.map((b) => b.packageName));

/**
 * Claves de AsyncStorage para la detección automática de transacciones bancarias.
 * Compartidas entre app/settings.tsx (UI) y notificationHeadlessTask.ts (proceso headless
 * sin contexto React, que las lee directamente de AsyncStorage).
 */
export const AUTO_DETECT_ENABLED_KEY = "mywallet-auto-detect-enabled";
export const ALLOWED_BANKS_KEY = "mywallet-auto-detect-banks";
