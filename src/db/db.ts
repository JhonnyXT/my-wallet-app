import { Platform } from "react-native";

export interface TransactionRow {
  id: number;
  amount: number;
  description: string;
  category_emoji: string;
  date: string;
}

// In-memory fallback for web (dev only)
let memoryStore: TransactionRow[] = [];
let memoryIdCounter = 1;

let _db: any = null;

async function getNativeDatabase() {
  if (_db) return _db;
  const SQLite = require("expo-sqlite");
  _db = await SQLite.openDatabaseAsync("mywallet.db");
  return _db;
}

export async function initDatabase(): Promise<void> {
  if (Platform.OS === "web") return;

  const db = await getNativeDatabase();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      category_emoji TEXT NOT NULL DEFAULT '💰',
      date TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);
}

export async function insertTransaction(
  amount: number,
  description: string,
  categoryEmoji: string
): Promise<TransactionRow> {
  const now = new Date().toISOString();

  if (Platform.OS === "web") {
    const tx: TransactionRow = {
      id: memoryIdCounter++,
      amount,
      description,
      category_emoji: categoryEmoji,
      date: now,
    };
    memoryStore.unshift(tx);
    return tx;
  }

  const db = await getNativeDatabase();
  const result = await db.runAsync(
    `INSERT INTO transactions (amount, description, category_emoji, date) VALUES (?, ?, ?, ?)`,
    [amount, description, categoryEmoji, now]
  );

  return {
    id: result.lastInsertRowId,
    amount,
    description,
    category_emoji: categoryEmoji,
    date: now,
  };
}

export async function deleteTransaction(id: number): Promise<void> {
  if (Platform.OS === "web") {
    memoryStore = memoryStore.filter((t) => t.id !== id);
    return;
  }

  const db = await getNativeDatabase();
  await db.runAsync(`DELETE FROM transactions WHERE id = ?`, [id]);
}

export async function getAllTransactions(): Promise<TransactionRow[]> {
  if (Platform.OS === "web") {
    return [...memoryStore];
  }

  const db = await getNativeDatabase();
  return db.getAllAsync<TransactionRow>(
    `SELECT * FROM transactions ORDER BY date DESC`
  );
}

export async function getMonthlyTotal(): Promise<number> {
  if (Platform.OS === "web") {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return memoryStore
      .filter((t) => new Date(t.date) >= firstDay)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  const db = await getNativeDatabase();
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const result = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM transactions WHERE date >= ?`,
    [firstDay]
  );
  return result?.total ?? 0;
}
