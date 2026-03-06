import * as SQLite from "expo-sqlite";

export interface TransactionRow {
  id: number;
  amount: number;
  description: string;
  category_emoji: string;
  date: string;
}

let _db: SQLite.SQLiteDatabase | null = null;

async function getNativeDatabase() {
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
  const db = await getNativeDatabase();
  await db.runAsync(`DELETE FROM transactions WHERE id = ?`, [id]);
}

export async function getAllTransactions(): Promise<TransactionRow[]> {
  const db = await getNativeDatabase();
  return db.getAllAsync<TransactionRow>(
    `SELECT * FROM transactions ORDER BY date DESC`
  );
}

export async function hasAnyTransactions(): Promise<boolean> {
  const db = await getNativeDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM transactions`
  );
  return (result?.count ?? 0) > 0;
}

export async function countTransactions(): Promise<number> {
  const db = await getNativeDatabase();
  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM transactions`
  );
  return result?.count ?? 0;
}

export async function clearTransactions(): Promise<void> {
  const db = await getNativeDatabase();
  await db.runAsync(`DELETE FROM transactions`);
}

/** Inserts demo data covering all filter periods */
export async function seedDemoData(): Promise<void> {
  const now = new Date();

  // Fecha relativa (daysAgo desde hoy) + hora
  function d(daysAgo: number, h: number, m: number): string {
    const t = new Date(now);
    t.setDate(t.getDate() - daysAgo);
    t.setHours(h, m, 0, 0);
    return t.toISOString();
  }

  // Fecha en un mes anterior relativo (1 = mes pasado, 2 = hace 2 meses…)
  function prevMonth(monthsAgo: number, day: number, h: number, m: number): string {
    const t = new Date(now.getFullYear(), now.getMonth() - monthsAgo, day, h, m, 0, 0);
    return t.toISOString();
  }

  const seed: { amount: number; desc: string; emoji: string; date: string }[] = [
    // ── HOY ──────────────────────────────────────────────────────────────
    { amount:  12500, desc: "Café mañanero",     emoji: "☕",  date: d(0,  8, 30) },
    { amount:  45000, desc: "Almuerzo",           emoji: "🍔",  date: d(0, 13, 15) },
    { amount:   8500, desc: "Taxi al trabajo",    emoji: "🚗",  date: d(0, 17, 50) },

    // ── AYER ──────────────────────────────────────────────────────────────
    { amount:  28000, desc: "Restaurante",        emoji: "🍔",  date: d(1, 18, 45) },
    { amount:  15000, desc: "Uber",               emoji: "🚗",  date: d(1, 16, 20) },
    { amount: -850000, desc: "Nómina",            emoji: "💰",  date: d(1,  9,  0) },

    // ── ESTA SEMANA (2–7 días) ────────────────────────────────────────────
    { amount:  35400, desc: "PlayStation Store",  emoji: "🎮",  date: d(2, 14, 10) },
    { amount:  18900, desc: "Zara",               emoji: "🛍️", date: d(3, 11, 30) },
    { amount:   9800, desc: "Farmacia",           emoji: "💊",  date: d(4, 10,  0) },
    { amount:   5500, desc: "Gasolina",           emoji: "🚗",  date: d(5, 19, 45) },
    { amount:  22000, desc: "Domicilio",          emoji: "🍔",  date: d(6,  8, 20) },

    // ── ESTE MES (8–28 días) ──────────────────────────────────────────────
    { amount:  85000, desc: "Arriendo",           emoji: "🏠",  date: d(8,  9,  0) },
    { amount:  14500, desc: "H&M",                emoji: "🛍️", date: d(10, 16, 30) },
    { amount:   6200, desc: "Starbucks",          emoji: "☕",  date: d(12,  8,  0) },
    { amount: -200000, desc: "Freelance",         emoji: "💰",  date: d(14,  9,  0) },
    { amount:  31000, desc: "Netflix + Spotify",  emoji: "🎮",  date: d(16, 21,  0) },
    { amount:   9500, desc: "Transporte público", emoji: "🚗",  date: d(18,  7, 30) },
    { amount:  42000, desc: "Cena cumpleaños",    emoji: "🍔",  date: d(20, 20,  0) },
    { amount:  11800, desc: "Electricidad",       emoji: "💡",  date: d(22, 11,  0) },
    { amount:  28000, desc: "Compras mercado",    emoji: "🛍️", date: d(25, 15,  0) },

    // ── MES PASADO ────────────────────────────────────────────────────────
    { amount: -500000, desc: "Salario",           emoji: "💰",  date: prevMonth(1,  1,  9,  0) },
    { amount: 130000,  desc: "Ropa temporada",    emoji: "🛍️", date: prevMonth(1, 15, 11,  0) },
    { amount:  28500,  desc: "Xbox Game Pass",    emoji: "🎮",  date: prevMonth(1, 20, 21,  0) },
    { amount:  95000,  desc: "Arriendo",          emoji: "🏠",  date: prevMonth(1,  2,  9,  0) },
    { amount:  47000,  desc: "Mecánico",          emoji: "🚗",  date: prevMonth(1, 10,  8,  0) },

    // ── HACE 2 MESES ──────────────────────────────────────────────────────
    { amount: -500000, desc: "Salario",           emoji: "💰",  date: prevMonth(2,  1,  9,  0) },
    { amount:  62000,  desc: "Médico especialista", emoji: "💊", date: prevMonth(2,  5, 16,  0) },
    { amount:  19000,  desc: "Café con clientes", emoji: "☕",  date: prevMonth(2, 22,  9,  0) },
    { amount:  88000,  desc: "Arriendo",          emoji: "🏠",  date: prevMonth(2,  3, 10,  0) },
    { amount:  35000,  desc: "Curso online",      emoji: "🎓",  date: prevMonth(2, 15, 14,  0) },

    // ── HACE 3 MESES ──────────────────────────────────────────────────────
    { amount: -500000, desc: "Salario",           emoji: "💰",  date: prevMonth(3,  1,  9,  0) },
    { amount:  92000,  desc: "Arriendo",          emoji: "🏠",  date: prevMonth(3,  2,  9,  0) },
    { amount:  45000,  desc: "Supermercado",      emoji: "🛍️", date: prevMonth(3, 10, 17,  0) },
    { amount:  18000,  desc: "Internet",          emoji: "💡",  date: prevMonth(3, 15, 10,  0) },
  ];

  const db = await getNativeDatabase();
  for (const tx of seed) {
    await db.runAsync(
      `INSERT INTO transactions (amount, description, category_emoji, date) VALUES (?, ?, ?, ?)`,
      [tx.amount, tx.desc, tx.emoji, tx.date]
    );
  }
}

export async function getMonthlyTotal(): Promise<number> {
  const db = await getNativeDatabase();
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const result = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(amount) as total FROM transactions WHERE date >= ?`,
    [firstDay]
  );
  return result?.total ?? 0;
}
