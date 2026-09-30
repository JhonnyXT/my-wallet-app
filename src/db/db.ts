import * as SQLite from "expo-sqlite";
import { DEFAULT_LIST_ID } from "@/src/constants/lists";
import { newId } from "@/src/utils/ids";

export interface TransactionRow {
  id: number;
  amount: number;
  description: string;
  category_emoji: string;
  date: string;
  /** JSON serializado de string[] — usar JSON.parse para leer, JSON.stringify para escribir */
  tags: string;
  payment_method: string;
  /** Lista a la que pertenece (ver `useSettingsStore.lists`); "personal" por defecto. */
  list_id: string;
  /** Quién lo pagó: "" = tú (dueño del teléfono); si no, el id de un miembro de la lista. */
  paid_by: string;
  /** Id global (UUID v4), igual en todos los teléfonos; `id` es solo local. */
  uid: string;
  /** Última edición, epoch ms (instante de máquina, no fecha local: se compara entre teléfonos). */
  updated_at: number;
  /** Borrado lógico, epoch ms; null = vivo. Las lecturas lo excluyen vía `LIST_SCOPE_SQL`. */
  deleted_at: number | null;
  /** "pending" hasta que la sync confirme la subida. */
  sync_state: SyncState;
}

export type SyncState = "pending" | "synced";

/** `paid_by` de lo que pagaste tú. */
export const SELF_PAYER = "";

export { DEFAULT_LIST_ID };

// Lista activa. Personal es TODO tu dinero: ve sus movimientos y los de las otras listas que
// pagaste tú (lo que pagó otro miembro de "Opa!" no salió de tu bolsillo); otra lista (un
// viaje, un negocio…) ve todos los suyos. Lo nuevo se guarda en la activa salvo que se indique
// otra. La fija `useFinanceStore.loadTransactions()` (tras rehidratar los ajustes).
let _activeListId = DEFAULT_LIST_ID;

/**
 * Filtro de toda lectura de `transactions`: excluye los borrados lógicos y aplica el alcance de la
 * lista activa. Va con `...listScopeParams()` en los parámetros.
 */
export const LIST_SCOPE_SQL = `(deleted_at IS NULL AND ((? = '${DEFAULT_LIST_ID}' AND paid_by = '${SELF_PAYER}') OR list_id = ?))`;

/** Los borrados ya subidos se purgan físicamente pasado este margen. */
const TOMBSTONE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// UUID v4 armado en SQL (se evalúa por fila): solo para asignar `uid` a filas que no lo tienen.
const UUID_V4_SQL = `lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
  substr(lower(hex(randomblob(2))), 2) || '-' ||
  substr('89ab', 1 + (abs(random()) % 4), 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
  lower(hex(randomblob(6)))`;

export function listScopeParams(): string[] {
  return [_activeListId, _activeListId];
}

export function setActiveListId(id: string): void {
  _activeListId = id;
}

export function getActiveListId(): string {
  return _activeListId;
}

let _db: SQLite.SQLiteDatabase | null = null;

export async function getNativeDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync("mywallet.db");
  return _db;
}

export async function initDatabase(): Promise<void> {
  const db = await getNativeDatabase();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      category_emoji TEXT NOT NULL DEFAULT '💰',
      date TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      tags TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_tx_date            ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_tx_category_emoji  ON transactions(category_emoji);
  `);
  // Migraciones aditivas: "duplicate column" es esperado en actualizaciones; otros errores se relanzar
  for (const migration of [
    `ALTER TABLE transactions ADD COLUMN tags TEXT NOT NULL DEFAULT ''`,
    `ALTER TABLE transactions ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash'`,
    `ALTER TABLE transactions ADD COLUMN list_id TEXT NOT NULL DEFAULT '${DEFAULT_LIST_ID}'`,
    `ALTER TABLE transactions ADD COLUMN paid_by TEXT NOT NULL DEFAULT '${SELF_PAYER}'`,
    `ALTER TABLE transactions ADD COLUMN uid TEXT`,
    `ALTER TABLE transactions ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE transactions ADD COLUMN deleted_at INTEGER`,
    `ALTER TABLE transactions ADD COLUMN sync_state TEXT NOT NULL DEFAULT 'pending'`,
  ]) {
    try {
      await db.execAsync(migration);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.toLowerCase().includes("duplicate column")) {
        throw e;
      }
    }
  }
  await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_tx_list_date ON transactions(list_id, date);`);
  // En cada arranque (idempotente): filas previas a la sync o metidas por fuera de la app (seed)
  // reciben id global y fecha de edición. El índice único va después, con todo ya lleno.
  await db.runAsync(`UPDATE transactions SET uid = ${UUID_V4_SQL} WHERE uid IS NULL`);
  await db.runAsync(`UPDATE transactions SET updated_at = ? WHERE updated_at = 0`, [Date.now()]);
  await db.execAsync(`CREATE UNIQUE INDEX IF NOT EXISTS idx_tx_uid ON transactions(uid);`);
}

/** Formato ISO local (sin conversión UTC) para evitar desfase de zona horaria */
export function localISOString(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.000`
  );
}

export async function insertTransaction(
  amount: number,
  description: string,
  categoryEmoji: string,
  tags: string[] = [],
  date?: Date,
  paymentMethod: string = "cash",
  listId: string = _activeListId,
  paidBy: string = SELF_PAYER,
): Promise<TransactionRow> {
  const dateStr = localISOString(date ?? new Date());
  const tagsStr = tags.length > 0 ? JSON.stringify(tags) : "";
  const uid = newId();
  const now = Date.now();
  const db = await getNativeDatabase();
  const result = await db.runAsync(
    `INSERT INTO transactions (amount, description, category_emoji, date, tags, payment_method, list_id, paid_by, uid, updated_at, sync_state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [amount, description, categoryEmoji, dateStr, tagsStr, paymentMethod, listId, paidBy, uid, now],
  );
  return {
    id: result.lastInsertRowId,
    amount,
    description,
    category_emoji: categoryEmoji,
    date: dateStr,
    tags: tagsStr,
    payment_method: paymentMethod,
    list_id: listId,
    paid_by: paidBy,
    uid,
    updated_at: now,
    deleted_at: null,
    sync_state: "pending",
  };
}

export async function updateTransaction(
  id: number,
  amount: number,
  description: string,
  categoryEmoji: string,
  tags: string[] = [],
  date?: Date,
  paymentMethod: string = "cash",
  /** Mover a otra lista; sin valor conserva la que ya tiene (editar desde Personal no mueve). */
  listId?: string,
  /** Cambiar quién pagó; sin valor conserva el actual. */
  paidBy?: string,
): Promise<TransactionRow> {
  const dateStr = localISOString(date ?? new Date());
  const tagsStr = tags.length > 0 ? JSON.stringify(tags) : "";
  const now = Date.now();
  const db = await getNativeDatabase();
  await db.runAsync(
    `UPDATE transactions SET amount = ?, description = ?, category_emoji = ?, date = ?, tags = ?, payment_method = ?, list_id = COALESCE(?, list_id), paid_by = COALESCE(?, paid_by), updated_at = ?, sync_state = 'pending' WHERE id = ?`,
    [
      amount,
      description,
      categoryEmoji,
      dateStr,
      tagsStr,
      paymentMethod,
      listId ?? null,
      paidBy ?? null,
      now,
      id,
    ],
  );
  const row = await db.getFirstAsync<{
    list_id: string;
    paid_by: string;
    uid: string;
    deleted_at: number | null;
  }>(`SELECT list_id, paid_by, uid, deleted_at FROM transactions WHERE id = ?`, [id]);
  return {
    id,
    amount,
    description,
    category_emoji: categoryEmoji,
    date: dateStr,
    tags: tagsStr,
    payment_method: paymentMethod,
    list_id: row?.list_id ?? listId ?? _activeListId,
    paid_by: row?.paid_by ?? paidBy ?? SELF_PAYER,
    uid: row?.uid ?? "",
    updated_at: now,
    deleted_at: row?.deleted_at ?? null,
    sync_state: "pending",
  };
}

// Borrado lógico: la fila queda como tombstone para que la sync avise a los otros teléfonos.
// `deleted_at IS NULL` evita re-fechar un borrado viejo (postergaría su purga).
const SOFT_DELETE_SQL = `UPDATE transactions SET deleted_at = ?, updated_at = ?, sync_state = 'pending'`;

export async function deleteTransaction(id: number): Promise<void> {
  const db = await getNativeDatabase();
  const now = Date.now();
  await db.runAsync(`${SOFT_DELETE_SQL} WHERE id = ? AND deleted_at IS NULL`, [now, now, id]);
}

export async function getAllTransactions(): Promise<TransactionRow[]> {
  const db = await getNativeDatabase();
  return db.getAllAsync<TransactionRow>(
    `SELECT * FROM transactions WHERE ${LIST_SCOPE_SQL} ORDER BY date DESC`,
    listScopeParams(),
  );
}

/** Borra todas las transacciones de una lista (al eliminar la lista). */
export async function deleteTransactionsOfList(listId: string): Promise<void> {
  const db = await getNativeDatabase();
  const now = Date.now();
  await db.runAsync(`${SOFT_DELETE_SQL} WHERE list_id = ? AND deleted_at IS NULL`, [
    now,
    now,
    listId,
  ]);
}

export async function hasAnyTransactions(): Promise<boolean> {
  const db = await getNativeDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM transactions WHERE ${LIST_SCOPE_SQL}`,
    listScopeParams(),
  );
  return (result?.count ?? 0) > 0;
}

export async function clearTransactions(): Promise<void> {
  const db = await getNativeDatabase();
  const now = Date.now();
  // Desde Personal borra todo (de todas las listas); desde otra lista, solo lo de esa lista.
  if (_activeListId === DEFAULT_LIST_ID) {
    await db.runAsync(`${SOFT_DELETE_SQL} WHERE deleted_at IS NULL`, [now, now]);
  } else {
    await db.runAsync(`${SOFT_DELETE_SQL} WHERE list_id = ? AND deleted_at IS NULL`, [
      now,
      now,
      _activeListId,
    ]);
  }
}

/**
 * Borra físicamente los tombstones que la nube ya conoce (`synced`) y tienen más de 30 días.
 * Nunca toca un borrado pendiente de subir. Devuelve cuántas filas purgó.
 */
export async function purgeSyncedTombstones(now = Date.now()): Promise<number> {
  const db = await getNativeDatabase();
  const result = await db.runAsync(
    `DELETE FROM transactions WHERE deleted_at IS NOT NULL AND sync_state = 'synced' AND deleted_at < ?`,
    [now - TOMBSTONE_TTL_MS],
  );
  return result.changes;
}

// ─── Sync (Fase 3): sin red, las llama src/sync/ ─────────────────────────────────
// Leen y escriben TODAS las listas (el respaldo es de todo), así que a propósito no usan
// LIST_SCOPE_SQL; `listScope.test.ts` las tiene en su lista de excepciones.

/** Fila tal como llega de la nube (sin `id` local ni `sync_state`). */
export type SyncedTransaction = Omit<TransactionRow, "id" | "sync_state">;

/** Pendientes de subir, borrados incluidos (un borrado también hay que avisarlo). */
export async function getPendingTransactions(limit: number): Promise<TransactionRow[]> {
  const db = await getNativeDatabase();
  return db.getAllAsync<TransactionRow>(
    `SELECT * FROM transactions WHERE sync_state = 'pending' ORDER BY updated_at LIMIT ?`,
    [limit],
  );
}

export async function countPendingTransactions(): Promise<number> {
  const db = await getNativeDatabase();
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM transactions WHERE sync_state = 'pending'`,
  );
  return row?.n ?? 0;
}

/**
 * Marca como subidas las versiones confirmadas por la nube. Solo si la fila no cambió mientras se
 * subía (`updated_at` igual): una edición hecha durante la subida sigue pendiente.
 */
export async function markTransactionsSynced(
  versions: { uid: string; updated_at: number }[],
): Promise<void> {
  if (versions.length === 0) return;
  const db = await getNativeDatabase();
  await db.withTransactionAsync(async () => {
    for (const v of versions) {
      await db.runAsync(
        `UPDATE transactions SET sync_state = 'synced' WHERE uid = ? AND updated_at = ?`,
        [v.uid, v.updated_at],
      );
    }
  });
}

/** Versión local de cada `uid` (para decidir qué gana al traer). */
export async function getTransactionVersions(
  uids: string[],
): Promise<Map<string, { updated_at: number; deleted_at: number | null }>> {
  const db = await getNativeDatabase();
  const out = new Map<string, { updated_at: number; deleted_at: number | null }>();
  // SQLite limita los parámetros por consulta: por tandas.
  for (let i = 0; i < uids.length; i += 500) {
    const chunk = uids.slice(i, i + 500);
    const rows = await db.getAllAsync<{
      uid: string;
      updated_at: number;
      deleted_at: number | null;
    }>(
      `SELECT uid, updated_at, deleted_at FROM transactions WHERE uid IN (${chunk.map(() => "?").join(",")})`,
      chunk,
    );
    for (const r of rows) out.set(r.uid, { updated_at: r.updated_at, deleted_at: r.deleted_at });
  }
  return out;
}

/**
 * Aplica transacciones traídas que ya ganaron a la copia local (la decisión la toma
 * `transactionsToApply`). Quedan `synced`: no se vuelven a subir.
 */
export async function applyRemoteTransactions(rows: SyncedTransaction[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await getNativeDatabase();
  await db.withTransactionAsync(async () => {
    for (const r of rows) {
      await db.runAsync(
        `INSERT INTO transactions (amount, description, category_emoji, date, tags, payment_method, list_id, paid_by, uid, updated_at, deleted_at, sync_state)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
         ON CONFLICT(uid) DO UPDATE SET
           amount = excluded.amount, description = excluded.description,
           category_emoji = excluded.category_emoji, date = excluded.date, tags = excluded.tags,
           payment_method = excluded.payment_method, list_id = excluded.list_id,
           paid_by = excluded.paid_by, updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at, sync_state = 'synced'`,
        [
          r.amount,
          r.description,
          r.category_emoji,
          r.date,
          r.tags,
          r.payment_method,
          r.list_id,
          r.paid_by,
          r.uid,
          r.updated_at,
          r.deleted_at,
        ],
      );
    }
  });
}

/** "Borrar de este teléfono" (cerrar sesión): borrado físico de todo. Ya está en la nube. */
export async function wipeAllTransactions(): Promise<void> {
  const db = await getNativeDatabase();
  await db.runAsync(`DELETE FROM transactions`);
}

export async function getMonthlyTotal(): Promise<number> {
  const db = await getNativeDatabase();
  const now = new Date();
  const firstDay = localISOString(new Date(now.getFullYear(), now.getMonth(), 1));
  const result = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM transactions WHERE ${LIST_SCOPE_SQL} AND date >= ?`,
    [...listScopeParams(), firstDay],
  );
  return result?.total ?? 0;
}

/**
 * Inserta múltiples transacciones en una sola transacción SQLite atómica.
 * Si cualquier inserción falla, se hace rollback completo (no queda estado parcial).
 */
export async function insertTransactionBatch(
  items: {
    amount: number;
    description: string;
    categoryEmoji: string;
    tags?: string[];
    date?: Date;
    paymentMethod?: string;
    /** Quién pagó (importar CSV); por defecto tú. */
    paidBy?: string;
  }[],
): Promise<TransactionRow[]> {
  const db = await getNativeDatabase();
  const inserted: TransactionRow[] = [];
  const now = Date.now();

  await db.withTransactionAsync(async () => {
    for (const item of items) {
      const uid = newId();
      const dateStr = localISOString(item.date ?? new Date());
      const tagsStr = item.tags && item.tags.length > 0 ? JSON.stringify(item.tags) : "";
      const method = item.paymentMethod ?? "cash";
      const result = await db.runAsync(
        `INSERT INTO transactions (amount, description, category_emoji, date, tags, payment_method, list_id, paid_by, uid, updated_at, sync_state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [
          item.amount,
          item.description,
          item.categoryEmoji,
          dateStr,
          tagsStr,
          method,
          _activeListId,
          item.paidBy ?? SELF_PAYER,
          uid,
          now,
        ],
      );
      inserted.push({
        id: result.lastInsertRowId,
        amount: item.amount,
        description: item.description,
        category_emoji: item.categoryEmoji,
        date: dateStr,
        tags: tagsStr,
        payment_method: method,
        list_id: _activeListId,
        paid_by: item.paidBy ?? SELF_PAYER,
        uid,
        updated_at: now,
        deleted_at: null,
        sync_state: "pending",
      });
    }
  });

  return inserted;
}
