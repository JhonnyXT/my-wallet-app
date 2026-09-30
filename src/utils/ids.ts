import { randomUUID } from "expo-crypto";

/**
 * Id global único (UUID v4) para lo que se va a sincronizar entre teléfonos: transacciones
 * (`uid`), listas, métodos de pago, metas y deudas. Los ids viejos (`Date.now()`, `list_…`) y
 * los fijos (`personal`, `cash`, `savings`, `credit`) se conservan: ver SYNC_ROADMAP.md Fase 1.
 */
export function newId(): string {
  return randomUUID();
}
