/**
 * Tests de `src/db/queries.ts` contra un motor SQLite real (ver `jest/sqliteTestAdapter.ts` y
 * `src/db/db.test.ts` para el porqué). Foco en el comportamiento menos obvio documentado en el
 * propio archivo: el denominador compartido de `queryCategoryMonthlyAverages` y los meses en 0
 * de `queryMonthlyTotalsInRange`.
 */
import { createTestDb, type TestSqliteHandle } from "@/jest/sqliteTestAdapter";

jest.mock("expo-sqlite", () => ({ openDatabaseAsync: jest.fn() }));

describe("src/db/queries.ts", () => {
  let handle: TestSqliteHandle;
  let db: typeof import("./db");
  let queries: typeof import("./queries");

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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    queries = require("./queries");
    await db.initDatabase();
  });

  afterEach(() => {
    handle.close();
  });

  describe("queryCategoryMonthlyAverages", () => {
    it("divide por los meses con actividad de CUALQUIER categoría, no por mes propio de cada una", async () => {
      // 🍔 tiene movimientos en 2 meses; 🎁 solo en 1 de esos 2 meses (esporádica).
      await db.insertTransaction(100_000, "Burger", "🍔", [], new Date(2026, 0, 15));
      await db.insertTransaction(100_000, "Burger", "🍔", [], new Date(2026, 1, 15));
      await db.insertTransaction(300_000, "Regalo", "🎁", [], new Date(2026, 0, 20));

      const result = await queries.queryCategoryMonthlyAverages("expense");
      expect(result.months).toBe(2); // enero y febrero, sin importar que 🎁 solo esté en uno

      const burger = result.items.find((i) => i.emoji === "🍔")!;
      const regalo = result.items.find((i) => i.emoji === "🎁")!;
      expect(burger.avgMonthly).toBe(200_000 / 2); // 100k
      // 🎁 se divide por los 2 meses del denominador compartido, no por su único mes propio.
      expect(regalo.avgMonthly).toBe(300_000 / 2); // 150k, NO 300k
    });

    it("separa gasto (amount > 0) de ingreso (amount < 0, se reporta en absoluto)", async () => {
      await db.insertTransaction(50_000, "Compra", "🛍️", [], new Date(2026, 0, 1));
      await db.insertTransaction(-200_000, "Salario", "💼", [], new Date(2026, 0, 1));

      const expense = await queries.queryCategoryMonthlyAverages("expense");
      expect(expense.items.map((i) => i.emoji)).toEqual(["🛍️"]);

      const income = await queries.queryCategoryMonthlyAverages("income");
      expect(income.items.map((i) => i.emoji)).toEqual(["💼"]);
      expect(income.items[0].total).toBe(200_000); // reportado en positivo
    });

    it("acota al rango cuando se pasa `range`", async () => {
      await db.insertTransaction(100_000, "Enero", "🍔", [], new Date(2026, 0, 15));
      await db.insertTransaction(100_000, "Marzo", "🍔", [], new Date(2026, 2, 15));

      const result = await queries.queryCategoryMonthlyAverages("expense", {
        from: "2026-01-01T00:00:00.000",
        to: "2026-01-31T23:59:59.000",
      });
      expect(result.months).toBe(1);
      expect(result.items[0].total).toBe(100_000);
    });
  });

  describe("queryMonthlyTotalsInRange", () => {
    it("rellena con 0 los meses sin movimientos dentro del rango", async () => {
      await db.insertTransaction(100_000, "Enero", "🍔", [], new Date(2026, 0, 15));
      await db.insertTransaction(300_000, "Marzo", "🍔", [], new Date(2026, 2, 15));

      const result = await queries.queryMonthlyTotalsInRange(
        "expense",
        new Date(2026, 0, 1),
        new Date(2026, 2, 1),
      );
      expect(result).toEqual([
        { year: 2026, month: 1, total: 100_000 },
        { year: 2026, month: 2, total: 0 },
        { year: 2026, month: 3, total: 300_000 },
      ]);
    });
  });

  describe("totales por período", () => {
    it("queryMonthTotal suma solo el mes/año pedido", async () => {
      await db.insertTransaction(100_000, "Este mes", "🍔", [], new Date(2026, 5, 10));
      await db.insertTransaction(999_999, "Otro mes", "🍔", [], new Date(2026, 6, 10));
      expect(await queries.queryMonthTotal(2026, 6)).toBe(100_000);
    });

    it("respeta el alcance por lista igual que getAllTransactions", async () => {
      await db.insertTransaction(100_000, "Personal", "🍔", [], new Date(2026, 5, 10));
      await db.insertTransaction(
        500_000,
        "Pagó otro en viaje",
        "🍔",
        [],
        new Date(2026, 5, 10),
        "cash",
        "viaje",
        "ana",
      );
      db.setActiveListId("personal");
      expect(await queries.queryMonthTotal(2026, 6)).toBe(100_000);
    });
  });

  it("queryFirstTransactionYear devuelve el año de la transacción más antigua", async () => {
    await db.insertTransaction(100, "Vieja", "🍔", [], new Date(2020, 0, 1));
    await db.insertTransaction(100, "Nueva", "🍔", [], new Date(2026, 0, 1));
    expect(await queries.queryFirstTransactionYear()).toBe(2020);
  });
});
