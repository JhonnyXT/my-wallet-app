import * as SQLite from "expo-sqlite";
import { DEFAULT_LIST_ID } from "@/src/constants/lists";

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
}

/** `paid_by` de lo que pagaste tú. */
export const SELF_PAYER = "";

export { DEFAULT_LIST_ID };

// Lista activa. Personal es TODO tu dinero: ve sus movimientos y los de las otras listas que
// pagaste tú (lo que pagó otro miembro de "Opa!" no salió de tu bolsillo); otra lista (un
// viaje, un negocio…) ve todos los suyos. Lo nuevo se guarda en la activa salvo que se indique
// otra. La fija `useFinanceStore.loadTransactions()` (tras rehidratar los ajustes).
let _activeListId = DEFAULT_LIST_ID;

/** Filtro por lista activa para un WHERE; va con `...listScopeParams()` en los parámetros. */
export const LIST_SCOPE_SQL = `((? = '${DEFAULT_LIST_ID}' AND paid_by = '${SELF_PAYER}') OR list_id = ?)`;

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
  const db = await getNativeDatabase();
  const result = await db.runAsync(
    `INSERT INTO transactions (amount, description, category_emoji, date, tags, payment_method, list_id, paid_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [amount, description, categoryEmoji, dateStr, tagsStr, paymentMethod, listId, paidBy],
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
  const db = await getNativeDatabase();
  await db.runAsync(
    `UPDATE transactions SET amount = ?, description = ?, category_emoji = ?, date = ?, tags = ?, payment_method = ?, list_id = COALESCE(?, list_id), paid_by = COALESCE(?, paid_by) WHERE id = ?`,
    [
      amount,
      description,
      categoryEmoji,
      dateStr,
      tagsStr,
      paymentMethod,
      listId ?? null,
      paidBy ?? null,
      id,
    ],
  );
  const row = await db.getFirstAsync<{ list_id: string; paid_by: string }>(
    `SELECT list_id, paid_by FROM transactions WHERE id = ?`,
    [id],
  );
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
  };
}

export async function deleteTransaction(id: number): Promise<void> {
  const db = await getNativeDatabase();
  await db.runAsync(`DELETE FROM transactions WHERE id = ?`, [id]);
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
  await db.runAsync(`DELETE FROM transactions WHERE list_id = ?`, [listId]);
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
  // Desde Personal borra todo (de todas las listas); desde otra lista, solo lo de esa lista.
  if (_activeListId === DEFAULT_LIST_ID) await db.runAsync(`DELETE FROM transactions`);
  else await db.runAsync(`DELETE FROM transactions WHERE list_id = ?`, [_activeListId]);
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

  await db.withTransactionAsync(async () => {
    for (const item of items) {
      const dateStr = localISOString(item.date ?? new Date());
      const tagsStr = item.tags && item.tags.length > 0 ? JSON.stringify(item.tags) : "";
      const method = item.paymentMethod ?? "cash";
      const result = await db.runAsync(
        `INSERT INTO transactions (amount, description, category_emoji, date, tags, payment_method, list_id, paid_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.amount,
          item.description,
          item.categoryEmoji,
          dateStr,
          tagsStr,
          method,
          _activeListId,
          item.paidBy ?? SELF_PAYER,
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
      });
    }
  });

  return inserted;
}
