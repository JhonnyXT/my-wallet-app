/**
 * Adaptador de test para `src/db/`: implementa la misma superficie async que usa `db.ts`/
 * `queries.ts` de `expo-sqlite` (execAsync/runAsync/getAllAsync/getFirstAsync/withTransactionAsync),
 * pero respaldado por `better-sqlite3` (motor SQLite real, no un mock inventado — ver ADR 0010,
 * que dejó `src/db/` sin tests por el riesgo de que un mock divergiera del motor real sin que
 * nadie lo notara). Cada test abre su propio archivo temporal con `createTestDb()`.
 */
import Database from "better-sqlite3";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export interface TestSqliteHandle {
  /** Lo que `jest.mock("expo-sqlite", ...)` debe devolver desde `openDatabaseAsync`. */
  adapter: {
    execAsync(sql: string): Promise<void>;
    runAsync(
      sql: string,
      params?: unknown[],
    ): Promise<{ lastInsertRowId: number; changes: number }>;
    getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
    getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
    withTransactionAsync(callback: () => Promise<void>): Promise<void>;
  };
  close(): void;
}

export function createTestDb(): TestSqliteHandle {
  const dir = mkdtempSync(join(tmpdir(), "mw-sqlite-test-"));
  const raw = new Database(join(dir, "test.db"));

  return {
    adapter: {
      async execAsync(sql) {
        raw.exec(sql);
      },
      async runAsync(sql, params = []) {
        const info = raw.prepare(sql).run(...(params as never[]));
        return { lastInsertRowId: Number(info.lastInsertRowid), changes: info.changes };
      },
      async getAllAsync<T>(sql: string, params: unknown[] = []) {
        return raw.prepare(sql).all(...(params as never[])) as T[];
      },
      async getFirstAsync<T>(sql: string, params: unknown[] = []) {
        return (raw.prepare(sql).get(...(params as never[])) ?? null) as T | null;
      },
      async withTransactionAsync(callback) {
        raw.exec("BEGIN");
        try {
          await callback();
          raw.exec("COMMIT");
        } catch (e) {
          raw.exec("ROLLBACK");
          throw e;
        }
      },
    },
    close() {
      raw.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
