/**
 * Conversión local ↔ documento de Firestore (SYNC_ROADMAP.md, "Modelo en Firestore"). Puras y
 * sin imports de Firebase (el `serverUpdatedAt` lo agrega `remote.ts` al escribir).
 */
import type { TransactionRow } from "@/src/db/db";
import type { TombstoneKind } from "@/src/store/slices/tombstonesSlice";

/** Colecciones de `users/{uid}` que se sincronizan ítem por ítem. */
export type ItemCollection = TombstoneKind | "transactions";

/** Nombre de la subcolección en Firestore (`savingsGoals` → `goals`, como en el roadmap). */
export const COLLECTION_PATH: Record<ItemCollection, string> = {
  lists: "lists",
  paymentMethods: "paymentMethods",
  savingsGoals: "goals",
  debts: "debts",
  transactions: "transactions",
};

/** Lo común a todo documento: versión (reloj del teléfono) y borrado lógico. */
export interface VersionedDoc {
  updatedAt: number;
  deletedAt?: number | null;
}

/** Documento remoto ya leído, con su id y el orden del servidor (ms) para el cursor. */
export interface RemoteDoc<T> {
  id: string;
  data: T & VersionedDoc;
  serverUpdatedAt: number;
}

/** Firestore rechaza `undefined`: se quitan los campos opcionales ausentes. */
export function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

/** Como `stripUndefined`, también dentro de objetos y arreglos (ej. personas de una lista). */
export function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripUndefinedDeep) as T;
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, stripUndefinedDeep(v)]),
  ) as T;
}

/** Ítem de ajustes (lista, método, meta, deuda) → documento: todo salvo el id. */
export function itemToDoc<T extends { id: string; updatedAt: number }>(
  item: T,
): Omit<T, "id"> & VersionedDoc {
  const { id: _id, ...rest } = item;
  return stripUndefinedDeep({ ...rest, deletedAt: null });
}

/** Documento → ítem de ajustes (sin `deletedAt`: los borrados van al registro de tombstones). */
export function docToItem<T extends { id: string; updatedAt: number }>(
  id: string,
  data: Omit<T, "id"> & VersionedDoc,
): T {
  const { deletedAt: _d, ...rest } = data;
  return { ...(rest as unknown as Omit<T, "id">), id } as T;
}

/** Borrado de un ítem de ajustes: solo la marca, sin el contenido. */
export function tombstoneDoc(deletedAt: number): VersionedDoc {
  return { updatedAt: deletedAt, deletedAt };
}

/** Transacción tal como se sube: sin `id` (local) ni `sync_state`; el id del doc es el `uid`. */
export interface TransactionDoc extends VersionedDoc {
  amount: number;
  description: string;
  category_emoji: string;
  date: string;
  tags: string;
  payment_method: string;
  list_id: string;
  paid_by: string;
}

export function transactionToDoc(row: TransactionRow): TransactionDoc {
  return {
    amount: row.amount,
    description: row.description,
    category_emoji: row.category_emoji,
    date: row.date,
    tags: row.tags,
    payment_method: row.payment_method,
    list_id: row.list_id,
    paid_by: row.paid_by,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

/** Fila para aplicar en SQLite (upsert por `uid`, sin `id` local). */
export type RemoteTransaction = Omit<TransactionRow, "id" | "sync_state">;

export function docToTransaction(uid: string, doc: TransactionDoc): RemoteTransaction {
  return {
    uid,
    amount: doc.amount,
    description: doc.description,
    category_emoji: doc.category_emoji,
    date: doc.date,
    tags: doc.tags ?? "",
    payment_method: doc.payment_method,
    list_id: doc.list_id,
    paid_by: doc.paid_by ?? "",
    updated_at: doc.updatedAt,
    deleted_at: doc.deletedAt ?? null,
  };
}
