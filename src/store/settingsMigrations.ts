/**
 * Migraciones del estado persistido de `useSettingsStore` (`mywallet-settings`). Puras y sin
 * imports nativos para poder probarlas en Jest. Cada cambio incompatible sube `SETTINGS_VERSION`
 * y agrega su paso aquí.
 */
import { DEFAULT_CADENCE, type PeriodCadence } from "@/src/utils/periodCycles";
import { EMPTY_TOMBSTONES } from "./slices/tombstonesSlice";

export const SETTINGS_VERSION = 3;

/** Colecciones que se sincronizan ítem por ítem (cada ítem lleva `updatedAt`). */
const SYNCED_COLLECTIONS = ["lists", "paymentMethods", "savingsGoals", "debts"] as const;

export function migrateSettings(
  persisted: unknown,
  version: number,
  now: number,
): Record<string, unknown> {
  const state = { ...(persisted as Record<string, unknown>) };

  // v0 → v1: el antiguo "Ingreso mensual" (monthlyBudget) pasa a ser el pago
  // esperado del período predeterminado, que en v0 siempre era mensual.
  if (version < 1) {
    const monthly = typeof state.monthlyBudget === "number" ? state.monthlyBudget : 0;
    const period = (state.defaultPeriod as PeriodCadence | undefined) ?? DEFAULT_CADENCE;
    if (monthly > 0 && period.type !== "semimonthly" && !period.pay) {
      state.defaultPeriod = { ...period, pay: monthly };
    }
    delete state.monthlyBudget;
  }

  // v1 → v2 (Sync Fase 1): fecha de edición en cada ítem sincronizable y registro de borrados.
  // Los ids existentes se conservan (los referencian transacciones, avisos y recordatorios).
  if (version < 2) {
    for (const key of SYNCED_COLLECTIONS) {
      const items = state[key];
      if (!Array.isArray(items)) continue;
      state[key] = items.map((item: Record<string, unknown>) =>
        typeof item.updatedAt === "number" ? item : { ...item, updatedAt: now },
      );
    }
    if (!state.tombstones) state.tombstones = EMPTY_TOMBSTONES;
  }

  // v2 → v3 (Sync Fase 3): fecha de edición de los documentos únicos (perfil y ajustes). En 0:
  // nada editado todavía, así al unir con la nube gana lo que ya estaba respaldado.
  if (version < 3) {
    if (typeof state.profileUpdatedAt !== "number") state.profileUpdatedAt = 0;
    if (typeof state.settingsUpdatedAt !== "number") state.settingsUpdatedAt = 0;
  }

  return state;
}
