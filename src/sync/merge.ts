/**
 * Unir lo traído de la nube con lo local (SYNC_ROADMAP.md, T5/T6/T8). Puras: deciden qué aplicar,
 * no aplican nada. La regla de conflicto es `pickWinner` (gana la última edición; en empate, el
 * borrado; si no, lo local).
 */
import { pickWinner, type Versioned } from "@/src/utils/syncMerge";
import { docToItem, type RemoteDoc, type VersionedDoc } from "./mappers";

type Item = { id: string; updatedAt: number };

export interface CollectionMerge<T extends Item> {
  items: T[];
  tombstones: Record<string, number>;
  /** Ids donde ganó lo remoto (se aplicó): la lista activa se trata aparte en el store. */
  remoteWon: string[];
  /** Versión que ya coincide con la nube por id: marcarla como subida evita reenviarla. */
  accepted: Record<string, number>;
}

function localVersion<T extends Item>(
  item: T | undefined,
  tombstone: number | undefined,
): Versioned | null {
  if (item) return { updatedAt: item.updatedAt };
  if (tombstone !== undefined) return { updatedAt: tombstone, deletedAt: tombstone };
  return null;
}

/**
 * Colección de ajustes (listas, métodos, metas, deudas): ítems vivos + registro de borrados
 * locales contra documentos remotos. Lo que no está en `remote` queda igual.
 */
export function mergeCollection<T extends Item>(
  localItems: T[],
  localTombstones: Record<string, number>,
  remote: RemoteDoc<Omit<T, "id">>[],
): CollectionMerge<T> {
  const items = new Map(localItems.map((i) => [i.id, i]));
  const order = localItems.map((i) => i.id);
  const tombstones = { ...localTombstones };
  const remoteWon: string[] = [];
  const accepted: Record<string, number> = {};

  for (const doc of remote) {
    const local = localVersion(items.get(doc.id), tombstones[doc.id]);
    const remoteDeleted = doc.data.deletedAt != null;
    if (local === null) {
      // Nuevo para este teléfono: se agrega si está vivo; un borrado de algo que nunca estuvo
      // aquí no deja rastro.
      if (!remoteDeleted) {
        items.set(doc.id, docToItem<T>(doc.id, doc.data as Omit<T, "id"> & VersionedDoc));
        order.push(doc.id);
        remoteWon.push(doc.id);
      }
      accepted[doc.id] = doc.data.updatedAt;
      continue;
    }
    if (pickWinner(local, doc.data) === "local") continue;

    remoteWon.push(doc.id);
    accepted[doc.id] = doc.data.updatedAt;
    if (remoteDeleted) {
      items.delete(doc.id);
      tombstones[doc.id] = doc.data.deletedAt as number;
    } else {
      if (!items.has(doc.id)) order.push(doc.id);
      items.set(doc.id, docToItem<T>(doc.id, doc.data as Omit<T, "id"> & VersionedDoc));
      delete tombstones[doc.id];
    }
  }

  return {
    items: order.filter((id) => items.has(id)).map((id) => items.get(id) as T),
    tombstones,
    remoteWon,
    accepted,
  };
}

/** Versión local de una transacción (de SQLite) para comparar. */
export interface LocalTxVersion {
  updated_at: number;
  deleted_at: number | null;
}

/**
 * Transacciones traídas que hay que aplicar en SQLite: las nuevas vivas y las que ganan a la copia
 * local. Un borrado remoto de algo que nunca estuvo aquí no se aplica.
 */
export function transactionsToApply<T extends { uid: string } & LocalTxVersion>(
  local: Map<string, LocalTxVersion>,
  remote: T[],
): T[] {
  return remote.filter((tx) => {
    const mine = local.get(tx.uid);
    if (!mine) return tx.deleted_at == null;
    return (
      pickWinner(
        { updatedAt: mine.updated_at, deletedAt: mine.deleted_at },
        { updatedAt: tx.updated_at, deletedAt: tx.deleted_at },
      ) === "remote"
    );
  });
}

/** Documento único (perfil, ajustes): ¿gana el remoto? */
export function remoteDocWins(localUpdatedAt: number, remote: VersionedDoc | undefined): boolean {
  return remote != null && pickWinner({ updatedAt: localUpdatedAt }, remote) === "remote";
}
