import { buildListShareText } from "./listShareText";
import { computeSettlement } from "./settlement";

const names: Record<string, string> = { "": "Jonathan", m1: "Miguelangel" };

describe("buildListShareText", () => {
  it("resume totales de una lista sin personas", () => {
    const text = buildListShareText({
      emoji: "✈️",
      name: "Vacaciones a Seúl",
      periodLabel: "Todo el tiempo",
      expense: 2500000,
      income: 0,
      settlement: null,
      nameOf: (id) => names[id],
    });
    expect(text).toBe(
      [
        "✈️ Vacaciones a Seúl · Todo el tiempo",
        "Gastos: $2.500.000",
        "Ingresos: $0",
        "Balance: -$2.500.000",
        "",
        "Enviado desde MyWallet",
      ].join("\n"),
    );
  });

  it("incluye las cuentas y quién le debe a quién", () => {
    const settlement = computeSettlement(
      [
        { paid_by: "", amount: 300000 },
        { paid_by: "m1", amount: 100000 },
      ],
      ["", "m1"],
    );
    const text = buildListShareText({
      emoji: "💼",
      name: "Opa!",
      periodLabel: "Todo el tiempo",
      expense: 400000,
      income: 0,
      settlement,
      nameOf: (id) => names[id],
    });
    expect(text).toContain("Cuentas (partes iguales):");
    expect(text).toContain("• Jonathan: $300.000");
    expect(text).toContain("• Miguelangel: $100.000");
    expect(text).toContain("Miguelangel le debe $100.000 a Jonathan.");
  });
});
