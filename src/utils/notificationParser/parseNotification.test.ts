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
