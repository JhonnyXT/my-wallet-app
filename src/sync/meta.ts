/**
 * Estado de la sync en este teléfono (qué se trajo, qué se subió, de quién son los datos). Puro:
 * la lectura/escritura en AsyncStorage vive en `metaStore.ts`. Ver spec Fase 3, D2/D6.
 */
import type { ItemCollection } from "./mappers";
import type { TombstoneKind } from "@/src/store/slices/tombstonesSlice";

export type DocKind = "profile" | "settings";
export type CursorKey = ItemCollection | DocKind | `space:${string}`;

export function spaceCursorKey(spaceId: string): CursorKey {
  return `space:${spaceId}`;
}

export interface SyncMeta {
  /** Cuenta dueña de los datos del teléfono (null = nunca respaldados). */
  ownerUid: string | null;
  /**
   * Mayor `serverUpdatedAt` (ms) traído por colección: la próxima traída pide desde ahí. Los
   * movimientos de cada espacio usan la clave `spaceCursorKey(spaceId)` (Fase 4).
   */
  cursors: Partial<Record<CursorKey, number>>;
  /** Versión (`updatedAt`) ya subida por ítem de ajustes; las transacciones usan `sync_state`. */
  pushed: Record<TombstoneKind, Record<string, number>>;
  /** Versión ya subida de los documentos únicos. */
  pushedDocs: Partial<Record<DocKind, number>>;
  /** Por espacio: `sharedUpdatedAt` ya subido a su `config/list` (Fase 4). */
  pushedSpaces: Record<string, number>;
  /** Bancos activos (AsyncStorage directo): último valor visto y cuándo cambió. */
  banks: { value: string[]; updatedAt: number } | null;
  lastSyncAt: number | null;
}

export function emptyMeta(): SyncMeta {
  return {
    ownerUid: null,
    cursors: {},
    pushed: { lists: {}, paymentMethods: {}, savingsGoals: {}, debts: {} },
    pushedDocs: {},
    pushedSpaces: {},
    banks: null,
    lastSyncAt: null,
  };
}

/** ¿Hay que subir esta versión? (nunca subida, o más nueva que la subida). */
export function needsPush(pushedVersion: number | undefined, localVersion: number): boolean {
  return pushedVersion === undefined || localVersion > pushedVersion;
}

/**
 * Ítems y borrados de una colección de ajustes que faltan por subir.
 * Los borrados usan su fecha de borrado como versión.
 */
export function pendingItems<T extends { id: string; updatedAt: number }>(
  items: T[],
  tombstones: Record<string, number>,
  pushed: Record<string, number>,
): { upserts: T[]; deletes: { id: string; deletedAt: number }[] } {
  return {
    upserts: items.filter((i) => needsPush(pushed[i.id], i.updatedAt)),
    deletes: Object.entries(tombstones)
      .filter(([id, deletedAt]) => needsPush(pushed[id], deletedAt))
      .map(([id, deletedAt]) => ({ id, deletedAt })),
  };
}

/** Registra versiones ya subidas o ya iguales a la nube (no se vuelven a enviar). */
export function markPushed(meta: SyncMeta, kind: TombstoneKind, versions: Record<string, number>) {
  return { ...meta, pushed: { ...meta.pushed, [kind]: { ...meta.pushed[kind], ...versions } } };
}

/** El cursor solo avanza (dos corridas no deben retrocederlo). */
export function advanceCursor(meta: SyncMeta, key: CursorKey, serverUpdatedAt: number): SyncMeta {
  const current = meta.cursors[key] ?? 0;
  if (serverUpdatedAt <= current) return meta;
  return { ...meta, cursors: { ...meta.cursors, [key]: serverUpdatedAt } };
}

/**
 * Bancos activos: si el valor cambió desde el último visto, esa es su nueva versión (no tienen
 * fecha de edición propia porque los escribe AsyncStorage directo).
 */
export function trackBanks(meta: SyncMeta, current: string[], now: number): SyncMeta {
  const same =
    meta.banks !== null &&
    meta.banks.value.length === current.length &&
    meta.banks.value.every((b, i) => b === current[i]);
  if (same) return meta;
  // Primera vez en este teléfono: versión 0, para que lo de la nube gane al restaurar.
  return { ...meta, banks: { value: current, updatedAt: meta.banks === null ? 0 : now } };
}

/**
 * Olvida lo traído y subido de un espacio: al desconectar la lista (salir, quitado, eliminado) o
 * al ligarla de nuevo (volver a unirse), la próxima traída empieza de cero.
 */
export function forgetSpace(meta: SyncMeta, spaceId: string): SyncMeta {
  const cursors = { ...meta.cursors };
  delete cursors[spaceCursorKey(spaceId)];
  const pushedSpaces = { ...meta.pushedSpaces };
  delete pushedSpaces[spaceId];
  return { ...meta, cursors, pushedSpaces };
}

/** ¿Los datos del teléfono son de otra cuenta? (hay que preguntar antes de unir, RF-13). */
export function belongsToOtherAccount(meta: SyncMeta, uid: string): boolean {
  return meta.ownerUid !== null && meta.ownerUid !== uid;
}
