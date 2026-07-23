import { getDefaultPeriod, periodFilterLabel, applyPeriodFilter, MONTH_ABBR } from "./periodFilter";

// Formato local sin sufijo horario — igual al que produce localISOString() (Regla inmutable #3).
// NUNCA usar toISOString()/toJSON() acá: agregan 'Z' (UTC) y desalinean el filtro con la hora
// local del dispositivo.
function toLocalDateString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.000`
  );
}

describe("getDefaultPeriod", () => {
  it("devuelve 'Este mes' como período rápido por defecto", () => {
    expect(getDefaultPeriod()).toEqual({ type: "quick", label: "Este mes" });
  });
});

describe("periodFilterLabel", () => {
  it("usa el label tal cual para períodos 'quick'", () => {
    expect(periodFilterLabel({ type: "quick", label: "Hoy" })).toBe("Hoy");
  });

  it("formatea 'month' como 'Mes Año' usando MONTH_ABBR", () => {
    expect(periodFilterLabel({ type: "month", year: 2026, month: 3 })).toBe(
      `${MONTH_ABBR[2]} 2026`,
    );
  });

  it("formatea 'year' como el número de año", () => {
    expect(periodFilterLabel({ type: "year", year: 2026 })).toBe("2026");
  });

  it("formatea 'all' como 'Todo'", () => {
    expect(periodFilterLabel({ type: "all" })).toBe("Todo");
  });
});

describe("applyPeriodFilter", () => {
  const now = new Date();
  const today = { date: toLocalDateString(now) };

  it("'all' devuelve todas las transacciones sin filtrar", () => {
    const txs = [today, { date: toLocalDateString(new Date(2000, 0, 1)) }];
    expect(applyPeriodFilter(txs, { type: "all" })).toHaveLength(2);
  });

  it("'Hoy' incluye una transacción de hoy y excluye una de hace 2 días", () => {
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(now.getDate() - 2);
    const txs = [today, { date: toLocalDateString(twoDaysAgo) }];

    const result = applyPeriodFilter(txs, { type: "quick", label: "Hoy" });
    expect(result).toEqual([today]);
  });

  it("'year' incluye solo transacciones del año pedido", () => {
    const txs = [{ date: "2025-06-15T10:00:00.000" }, { date: "2024-06-15T10:00:00.000" }];
    expect(applyPeriodFilter(txs, { type: "year", year: 2025 })).toEqual([txs[0]]);
  });

  it("'month' incluye solo transacciones del mes/año pedido", () => {
    const txs = [
      { date: "2025-03-10T08:00:00.000" }, // dentro
      { date: "2025-04-01T00:00:00.000" }, // fuera (mes siguiente)
      { date: "2025-02-28T23:59:59.000" }, // fuera (mes anterior)
    ];
    expect(applyPeriodFilter(txs, { type: "month", year: 2025, month: 3 })).toEqual([txs[0]]);
  });
});
