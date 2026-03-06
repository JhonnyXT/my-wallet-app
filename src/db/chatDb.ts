/**
 * Chat persistence layer — stores sessions and messages in the local SQLite DB.
 * Uses the same "mywallet.db" file as the rest of the app.
 */
import * as SQLite from "expo-sqlite";

let _db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync("mywallet.db");
  return _db;
}

// ─── Row types ───────────────────────────────────────────────────────────────

export interface ChatSessionRow {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageRow {
  id: number;
  session_id: number;
  role: "user" | "assistant";
  text: string;
  card_json: string | null;
  created_at: string;
}

// ─── Init ────────────────────────────────────────────────────────────────────

export async function initChatTables(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT    NOT NULL DEFAULT 'Nueva conversación',
      created_at TEXT    NOT NULL,
      updated_at TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      role       TEXT    NOT NULL,
      text       TEXT    NOT NULL,
      card_json  TEXT,
      created_at TEXT    NOT NULL,
      FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    );
  `);
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function createChatSession(
  title: string = "Nueva conversación"
): Promise<ChatSessionRow> {
  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO chat_sessions (title, created_at, updated_at) VALUES (?, ?, ?)`,
    [title, now, now]
  );
  return { id: result.lastInsertRowId, title, created_at: now, updated_at: now };
}

export async function updateSessionTitle(
  id: number,
  title: string
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?`,
    [title, now, id]
  );
}

export async function touchSession(id: number): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE chat_sessions SET updated_at = ? WHERE id = ?`,
    [now, id]
  );
}

export async function getChatSessions(): Promise<ChatSessionRow[]> {
  const db = await getDb();
  return db.getAllAsync<ChatSessionRow>(
    `SELECT * FROM chat_sessions ORDER BY updated_at DESC`
  );
}

export async function deleteChatSession(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM chat_messages WHERE session_id = ?`, [id]);
  await db.runAsync(`DELETE FROM chat_sessions WHERE id = ?`, [id]);
}

// ─── Messages ────────────────────────────────────────────────────────────────

export async function addChatMessage(
  sessionId: number,
  role: "user" | "assistant",
  text: string,
  cardJson?: string
): Promise<ChatMessageRow> {
  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO chat_messages (session_id, role, text, card_json, created_at) VALUES (?, ?, ?, ?, ?)`,
    [sessionId, role, text, cardJson ?? null, now]
  );
  return {
    id: result.lastInsertRowId,
    session_id: sessionId,
    role,
    text,
    card_json: cardJson ?? null,
    created_at: now,
  };
}

export async function getChatMessages(
  sessionId: number
): Promise<ChatMessageRow[]> {
  const db = await getDb();
  return db.getAllAsync<ChatMessageRow>(
    `SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC`,
    [sessionId]
  );
}
