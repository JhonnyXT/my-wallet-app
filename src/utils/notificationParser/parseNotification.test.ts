// db.ts arrastra expo-sqlite (módulo nativo, no ejecuta en Jest/Node). parseNotification
// solo usa localISOString, que es pura — se mockea con la misma implementación real para
// no traer SQLite a un test de lógica de parsing sin ninguna dependencia de base de datos.
import { parseNotification } from "./parseNotification";
import { NOTIFICATION_FIXTURES } from "./fixtures";

jest.mock("@/src/db/db", () => ({
  localISOString: (date: Date = new Date()) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T` +
      `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.000`
    );
  },
}));

describe("parseNotification — fixtures reales", () => {
  it.each(NOTIFICATION_FIXTURES)("$label", (fixture) => {
    const result = parseNotification(fixture.packageName, fixture.title, fixture.text);

    if (fixture.expected.kind === "filtered") {
      expect(result).toBeNull();
    } else {
      expect(result).not.toBeNull();
      expect(result!.amount).toBe(fixture.expected.amount);
      expect(result!.isExpense).toBe(fixture.expected.isExpense);
    }
  });
});

describe("parseNotification — postedAt (StatusBarNotification.postTime real)", () => {
  it("usa postedAt para detectedAt en vez de 'ahora', cuando se pasa explícitamente", () => {
    const fixture = NOTIFICATION_FIXTURES.find((f) => f.expected.kind === "parsed")!;
    const postedAt = new Date(2026, 0, 15, 10, 30, 0); // 15 ene 2026, 10:30am — no "ahora"

    const result = parseNotification(fixture.packageName, fixture.title, fixture.text, postedAt);

    expect(result).not.toBeNull();
    expect(result!.detectedAt).toBe("2026-01-15T10:30:00.000");
  });

  it("sin postedAt, sigue usando 'ahora' (compatibilidad — el listener puede re-entregar sin postTime válido)", () => {
    const fixture = NOTIFICATION_FIXTURES.find((f) => f.expected.kind === "parsed")!;
    // localISOString trunca a segundos (".000"), así que la comparación también lo hace.
    const beforeSec = Math.floor(Date.now() / 1000);

    const result = parseNotification(fixture.packageName, fixture.title, fixture.text);

    expect(result).not.toBeNull();
    const detectedSec = Math.floor(new Date(result!.detectedAt).getTime() / 1000);
    expect(detectedSec).toBeGreaterThanOrEqual(beforeSec);
  });
});
