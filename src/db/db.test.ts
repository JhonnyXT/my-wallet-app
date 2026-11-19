/**
 * Tests de `src/db/db.ts` contra un motor SQLite real (better-sqlite3, ver
 * `jest/sqliteTestAdapter.ts`) en vez de un mock inventado de `expo-sqlite` — ver ADR 0010, que
 * dejó este archivo fuera a propósito mientras no hubiera una forma de probarlo sin arriesgar que
 * un mock divergiera del motor real.
 *
 * Cada test abre su propio archivo temporal (`createTestDb()` + `jest.resetModules()`) para que
 * el `_db` cacheado a nivel de módulo en `db.ts` nunca se comparta entre tests.
 */
import { createTestDb, type TestSqliteHandle } from "@/jest/sqliteTestAdapter";

jest.mock("expo-sqlite", () => ({ openDatabaseAsync: jest.fn() }));

describe("src/db/db.ts", () => {
  let handle: TestSqliteHandle;
  let db: typeof import("./db");

  beforeEach(async () => {
    jest.resetModules();
    handle = createTestDb();
    // require() dinámico a propósito: jest.resetModules() exige re-requerir después de cada
    // reset, un import estático solo se resolvería una vez.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SQLite = require("expo-sqlite");
    SQLite.openDatabaseAsync.mockResolvedValue(handle.adapter);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    db = require("./db");
    await db.initDatabase();
  });

  afterEach(() => {
    handle.close();
  });

  it("initDatabase es idempotente (se puede llamar dos veces sin error)", async () => {
    await expect(db.initDatabase()).resolves.toBeUndefined();
  });

  describe("insertTransaction", () => {
    it("inserta con los defaults de sync (pending, sin borrar, con uid)", async () => {
      const row = await db.insertTransaction(1000, "Café", "☕");
      expect(row.id).toBeGreaterThan(0);
      expect(row.sync_state).toBe("pending");
      expect(row.deleted_at).toBeNull();
      expect(row.uid).toMatch(/^[0-9a-f-]{36}$/);
      expect(row.list_id).toBe("personal");
      expect(row.paid_by).toBe("");
    });

    it("serializa tags como JSON solo si hay alguno", async () => {
      const withTags = await db.insertTransaction(500, "Uber", "🚗", ["viaje", "trabajo"]);
      expect(JSON.parse(withTags.tags)).toEqual(["viaje", "trabajo"]);

      const withoutTags = await db.insertTransaction(500, "Uber", "🚗");
      expect(withoutTags.tags).toBe("");
    });
  });

  describe("alcance por lista (LIST_SCOPE_SQL)", () => {
    it("Personal ve lo suyo + lo que pagó el dueño en otra lista, pero no lo que pagó otro miembro", async () => {
      await db.insertTransaction(100, "Personal", "💰"); // list_id personal, paid_by ""
      await db.insertTransaction(
        200,
        "Pagué yo en otra lista",
        "💰",
        [],
        undefined,
        "cash",
        "viaje",
        "",
      );
      await db.insertTransaction(300, "Pagó Ana", "💰", [], undefined, "cash", "viaje", "ana");

      db.setActiveListId("personal");
      const rows = await db.getAllTransactions();
      const descriptions = rows.map((r) => r.description).sort();
      expect(descriptions).toEqual(["Pagué yo en otra lista", "Personal"]);
    });

    it("una lista no-Personal ve solo lo suyo, sin importar quién pagó", async () => {
      await db.insertTransaction(100, "Personal", "💰");
      await db.insertTransaction(300, "Pagó Ana", "💰", [], undefined, "cash", "viaje", "ana");
      await db.insertTransaction(400, "Pagué yo", "💰", [], undefined, "cash", "viaje", "");

      db.setActiveListId("viaje");
      const rows = await db.getAllTransactions();
      const descriptions = rows.map((r) => r.description).sort();
      expect(descriptions).toEqual(["Pagué yo", "Pagó Ana"]);
    });

    it("getAllTransactions excluye los borrados lógicos", async () => {
      const row = await db.insertTransaction(100, "Se borra", "💰");
      await db.deleteTransaction(row.id);
      const rows = await db.getAllTransactions();
      expect(rows).toHaveLength(0);
    });
  });

  describe("updateTransaction", () => {
    it("actualiza los campos sin mover de lista", async () => {
      const row = await db.insertTransaction(100, "Original", "💰");
      const updated = await db.updateTransaction(row.id, 200, "Editado", "🍔");
      expect(updated.amount).toBe(200);
      expect(updated.description).toBe("Editado");
      expect(updated.uid).toBe(row.uid); // mismo uid: no se movió de lista
      expect(updated.list_id).toBe("personal");
    });

    it("mover de lista le da un uid nuevo y deja un tombstone con el uid viejo en la lista vieja", async () => {
      const row = await db.insertTransaction(
        100,
        "Viaje a la playa",
        "💰",
        [],
        undefined,
        "cash",
        "personal",
        "",
      );
      const oldUid = row.uid;

      const moved = await db.updateTransaction(
        row.id,
        100,
        "Viaje a la playa",
        "💰",
        [],
        undefined,
        "cash",
        "viaje", // nueva lista
      );

      expect(moved.uid).not.toBe(oldUid);
      expect(moved.list_id).toBe("viaje");

      // El tombstone quedó en la lista vieja, con el uid original, marcado como borrado.
      const all = await handle.adapter.getAllAsync<{
        uid: string;
        list_id: string;
        deleted_at: number | null;
      }>("SELECT uid, list_id, deleted_at FROM transactions WHERE uid = ?", [oldUid]);
      expect(all).toHaveLength(1);
      expect(all[0].list_id).toBe("personal");
      expect(all[0].deleted_at).not.toBeNull();
    });
  });

  describe("insertTransactionBatch", () => {
    it("inserta todas las filas en una sola transacción atómica", async () => {
      const inserted = await db.insertTransactionBatch([
        { amount: 100, description: "A", categoryEmoji: "💰" },
        { amount: 200, description: "B", categoryEmoji: "💰" },
        { amount: 300, description: "C", categoryEmoji: "💰" },
      ]);
      expect(inserted).toHaveLength(3);
      const rows = await db.getAllTransactions();
      expect(rows).toHaveLength(3);
    });

    it("si una inserción falla, no queda ninguna fila (rollback completo)", async () => {
      await expect(
        db.insertTransactionBatch([
          { amount: 100, description: "Buena", categoryEmoji: "💰" },
          // @ts-expect-error -- fuerza un error de tipo en SQLite (NOT NULL) a propósito
          { amount: null, description: "Mala", categoryEmoji: "💰" },
        ]),
      ).rejects.toThrow();
      const rows = await db.getAllTransactions();
      expect(rows).toHaveLength(0);
    });
  });

  describe("sync (Fase 3): pendientes, synced y conflictos", () => {
    it("countPendingTransactions / getPendingTransactions ven las filas pending, incluidos los borrados", async () => {
      const a = await db.insertTransaction(100, "A", "💰");
      const b = await db.insertTransaction(200, "B", "💰");
      await db.deleteTransaction(b.id);

      expect(await db.countPendingTransactions()).toBe(2);
      const pending = await db.getPendingTransactions(10);
      expect(pending.map((r) => r.uid).sort()).toEqual([a.uid, b.uid].sort());
    });

    it("markTransactionsSynced solo marca si updated_at no cambió mientras se subía", async () => {
      const row = await db.insertTransaction(100, "A", "💰");
      // Simula una edición que llegó DURANTE la subida: la versión que se intenta confirmar
      // (updated_at original) ya quedó vieja.
      await db.updateTransaction(row.id, 150, "A editada", "💰");

      await db.markTransactionsSynced([{ uid: row.uid, updated_at: row.updated_at }]);
      const stillPending = await handle.adapter.getFirstAsync<{ sync_state: string }>(
        "SELECT sync_state FROM transactions WHERE uid = ?",
        [row.uid],
      );
      expect(stillPending?.sync_state).toBe("pending");
    });

    it("applyRemoteTransactions: una versión remota más nueva gana", async () => {
      const row = await db.insertTransaction(100, "Local vieja", "💰");
      await db.applyRemoteTransactions([
        {
          amount: 999,
          description: "Remota nueva",
          category_emoji: "💰",
          date: row.date,
          tags: "",
          payment_method: "cash",
          list_id: "personal",
          paid_by: "",
          uid: row.uid,
          updated_at: row.updated_at + 1000,
          deleted_at: null,
        },
      ]);
      const after = await handle.adapter.getFirstAsync<{ description: string; amount: number }>(
        "SELECT description, amount FROM transactions WHERE uid = ?",
        [row.uid],
      );
      expect(after?.description).toBe("Remota nueva");
      expect(after?.amount).toBe(999);
    });

    it("applyRemoteTransactions: una versión remota más vieja NO pisa la local", async () => {
      const row = await db.insertTransaction(100, "Local nueva", "💰");
      await db.applyRemoteTransactions([
        {
          amount: 1,
          description: "Remota vieja",
          category_emoji: "💰",
          date: row.date,
          tags: "",
          payment_method: "cash",
          list_id: "personal",
          paid_by: "",
          uid: row.uid,
          updated_at: row.updated_at - 1000,
          deleted_at: null,
        },
      ]);
      const after = await handle.adapter.getFirstAsync<{ description: string }>(
        "SELECT description FROM transactions WHERE uid = ?",
        [row.uid],
      );
      expect(after?.description).toBe("Local nueva");
    });

    it("applyRemoteTransactions: un tombstone remoto solo marca una fila que ya existe (sin contenido no hay qué insertar)", async () => {
      await db.applyRemoteTransactions([
        { uid: "no-existe-localmente", updated_at: Date.now(), deleted_at: Date.now() },
      ]);
      const row = await handle.adapter.getFirstAsync("SELECT * FROM transactions WHERE uid = ?", [
        "no-existe-localmente",
      ]);
      expect(row).toBeNull();
    });

    it("purgeSyncedTombstones borra solo los synced y vencidos, nunca uno pendiente", async () => {
      // `deleteTransaction` mueve `updated_at` al momento del borrado — hay que releerlo de la
      // fila antes de confirmar la subida, no usar el `updated_at` del insert original.
      const updatedAtOf = async (uid: string) =>
        (
          await handle.adapter.getFirstAsync<{ updated_at: number }>(
            "SELECT updated_at FROM transactions WHERE uid = ?",
            [uid],
          )
        )?.updated_at ?? 0;

      const old = await db.insertTransaction(100, "Viejo synced", "💰");
      await db.deleteTransaction(old.id);
      await db.markTransactionsSynced([{ uid: old.uid, updated_at: await updatedAtOf(old.uid) }]);
      // Lo retrasa más allá del TTL de 30 días manipulando deleted_at directo.
      await handle.adapter.runAsync("UPDATE transactions SET deleted_at = ? WHERE uid = ?", [
        Date.now() - 31 * 24 * 60 * 60 * 1000,
        old.uid,
      ]);

      const recent = await db.insertTransaction(200, "Reciente synced", "💰");
      await db.deleteTransaction(recent.id);
      await db.markTransactionsSynced([
        { uid: recent.uid, updated_at: await updatedAtOf(recent.uid) },
      ]);

      const stillPending = await db.insertTransaction(300, "Pendiente sin subir", "💰");
      await db.deleteTransaction(stillPending.id);

      const purged = await db.purgeSyncedTombstones();
      expect(purged).toBe(1);

      const remainingUids = (
        await handle.adapter.getAllAsync<{ uid: string }>("SELECT uid FROM transactions", [])
      ).map((r) => r.uid);
      expect(remainingUids).not.toContain(old.uid);
      expect(remainingUids).toContain(recent.uid);
      expect(remainingUids).toContain(stillPending.uid);
    });
  });
});
