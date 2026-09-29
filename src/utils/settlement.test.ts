import { computeSettlement, settlementHeadline } from "./settlement";

const tx = (paid_by: string, amount: number) => ({ paid_by, amount });

describe("computeSettlement", () => {
  it("dos personas: el que pagó menos le debe la mitad de la diferencia", () => {
    const r = computeSettlement([tx("", 300000), tx("m1", 100000)], ["", "m1"]);
    expect(r.total).toBe(400000);
    expect(r.share).toBe(200000);
    expect(r.transfers).toEqual([{ from: "m1", to: "", amount: 100000 }]);
  });

  it("parejo no genera transferencias", () => {
    const r = computeSettlement([tx("", 50000), tx("m1", 50000)], ["", "m1"]);
    expect(r.transfers).toEqual([]);
  });

  it("tres personas: liquida con pocas transferencias", () => {
    const r = computeSettlement([tx("", 90000)], ["", "m1", "m2"]);
    expect(r.transfers).toEqual([
      { from: "m1", to: "", amount: 30000 },
      { from: "m2", to: "", amount: 30000 },
    ]);
  });

  it("ignora ingresos y pagos de alguien que ya no está en la lista", () => {
    const r = computeSettlement([tx("", -500000), tx("viejo", 80000), tx("m1", 20000)], ["", "m1"]);
    expect(r.total).toBe(20000);
    expect(r.transfers).toEqual([{ from: "", to: "m1", amount: 10000 }]);
  });
});

describe("settlementHeadline", () => {
  const nameOf = (id: string) => ({ m1: "Ana", m2: "Luis" })[id] ?? "?";
  const money = (n: number) => `$${n}`;

  it("una sola deuda, desde tu punto de vista", () => {
    const s = computeSettlement([tx("", 100)], ["", "m1"]);
    expect(settlementHeadline(s, "", nameOf, money)).toBe("Ana te debe $50");
    const s2 = computeSettlement([tx("m1", 100)], ["", "m1"]);
    expect(settlementHeadline(s2, "", nameOf, money)).toBe("Le debes $50 a Ana");
  });

  it("a mano o varias deudas", () => {
    expect(settlementHeadline(computeSettlement([], ["", "m1"]), "", nameOf, money)).toBe(
      "Están a mano",
    );
    const s = computeSettlement([tx("", 90)], ["", "m1", "m2"]);
    expect(settlementHeadline(s, "", nameOf, money)).toBe("2 cuentas pendientes");
  });
});
