import {
  budgetCycle,
  cycleAtOffset,
  cycleKey,
  cycleLabel,
  cycleStartContaining,
  defaultView,
  expectedPay,
  filterByRange,
  isDefaultView,
  listCycles,
  rangeLabel,
  sumByRanges,
  viewLabel,
  viewRange,
  type PeriodCadence,
} from "./periodCycles";

const d = (y: number, m: number, day: number, h = 12) => new Date(y, m - 1, day, h);
const ymd = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

describe("cycleStartContaining", () => {
  it("mensual día 1: inicio del mes calendario", () => {
    expect(ymd(cycleStartContaining({ type: "monthly", startDay: 1 }, d(2026, 7, 20)))).toBe(
      "2026-07-01",
    );
  });

  it("mensual con desfase: antes del día de inicio pertenece al ciclo del mes anterior", () => {
    const c: PeriodCadence = { type: "monthly", startDay: 18 };
    expect(ymd(cycleStartContaining(c, d(2026, 7, 20)))).toBe("2026-07-18");
    expect(ymd(cycleStartContaining(c, d(2026, 7, 17)))).toBe("2026-06-18");
    expect(ymd(cycleStartContaining(c, d(2026, 1, 5)))).toBe("2025-12-18");
  });

  it("semanal: retrocede hasta el día de inicio de semana (sábado = 6)", () => {
    // 2026-08-05 es miércoles
    expect(ymd(cycleStartContaining({ type: "weekly", weekStartsOn: 6 }, d(2026, 8, 5)))).toBe(
      "2026-08-01",
    );
    // El propio sábado inicia su semana
    expect(ymd(cycleStartContaining({ type: "weekly", weekStartsOn: 6 }, d(2026, 8, 1)))).toBe(
      "2026-08-01",
    );
    // Lunes (1)
    expect(ymd(cycleStartContaining({ type: "weekly", weekStartsOn: 1 }, d(2026, 8, 5)))).toBe(
      "2026-08-03",
    );
  });

  it("cada 2 semanas: bloques de 14 días desde el ancla, hacia adelante y hacia atrás", () => {
    const c: PeriodCadence = { type: "biweekly", weekStartsOn: 6, anchor: "2026-08-01" };
    expect(ymd(cycleStartContaining(c, d(2026, 8, 14)))).toBe("2026-08-01");
    expect(ymd(cycleStartContaining(c, d(2026, 8, 15)))).toBe("2026-08-15");
    expect(ymd(cycleStartContaining(c, d(2026, 7, 31)))).toBe("2026-07-18");
  });

  it("varias veces al mes: último día de inicio alcanzado, o el último del mes anterior", () => {
    const c: PeriodCadence = { type: "semimonthly", days: [1, 16] };
    expect(ymd(cycleStartContaining(c, d(2026, 7, 15)))).toBe("2026-07-01");
    expect(ymd(cycleStartContaining(c, d(2026, 7, 16)))).toBe("2026-07-16");
    const paid5and20: PeriodCadence = { type: "semimonthly", days: [20, 5] };
    expect(ymd(cycleStartContaining(paid5and20, d(2026, 7, 3)))).toBe("2026-06-20");
    expect(ymd(cycleStartContaining(paid5and20, d(2026, 7, 10)))).toBe("2026-07-05");
  });
});

describe("cycleAtOffset", () => {
  const now = d(2026, 7, 20);

  it("mensual con desfase: el ciclo termina el día anterior al siguiente inicio", () => {
    const r = cycleAtOffset({ type: "monthly", startDay: 18 }, 0, now);
    expect(ymd(r.start)).toBe("2026-07-18");
    expect(ymd(r.end)).toBe("2026-08-17");
    expect(r.end.getHours()).toBe(23);
  });

  it("offsets negativos y positivos", () => {
    const c: PeriodCadence = { type: "monthly", startDay: 1 };
    expect(ymd(cycleAtOffset(c, -1, now).start)).toBe("2026-06-01");
    expect(ymd(cycleAtOffset(c, -1, now).end)).toBe("2026-06-30");
    expect(ymd(cycleAtOffset(c, 1, now).start)).toBe("2026-08-01");
  });

  it("quincenal: 1–15 y 16–fin de mes", () => {
    const c: PeriodCadence = { type: "semimonthly", days: [1, 16] };
    const r = cycleAtOffset(c, 0, now);
    expect(ymd(r.start)).toBe("2026-07-16");
    expect(ymd(r.end)).toBe("2026-07-31");
    const prev = cycleAtOffset(c, -1, now);
    expect(ymd(prev.start)).toBe("2026-07-01");
    expect(ymd(prev.end)).toBe("2026-07-15");
  });

  it("semanal: 7 días", () => {
    const r = cycleAtOffset({ type: "weekly", weekStartsOn: 6 }, 1, d(2026, 8, 5));
    expect(ymd(r.start)).toBe("2026-08-08");
    expect(ymd(r.end)).toBe("2026-08-14");
  });
});

describe("listCycles", () => {
  it("va desde el ciclo del primer movimiento hasta el actual + los futuros pedidos", () => {
    const list = listCycles({ type: "monthly", startDay: 1 }, d(2026, 5, 10), d(2026, 7, 20), 1);
    expect(list.map((r) => ymd(r.start))).toEqual([
      "2026-05-01",
      "2026-06-01",
      "2026-07-01",
      "2026-08-01",
    ]);
  });

  it("sin movimientos: solo el ciclo actual y los futuros", () => {
    const list = listCycles({ type: "monthly", startDay: 1 }, null, d(2026, 7, 20), 1);
    expect(list.map((r) => ymd(r.start))).toEqual(["2026-07-01", "2026-08-01"]);
  });
});

describe("etiquetas", () => {
  const now = d(2026, 7, 20);

  it("rangeLabel: mismo día, mismo mes, meses distintos y años distintos", () => {
    expect(rangeLabel(d(2026, 7, 20), d(2026, 7, 20))).toBe("jul 20");
    expect(rangeLabel(d(2026, 7, 20), d(2026, 7, 31))).toBe("jul 20 – 31");
    expect(rangeLabel(d(2026, 7, 28), d(2026, 8, 3))).toBe("jul 28 – ago 3");
    expect(rangeLabel(d(2025, 12, 28), d(2026, 1, 3))).toBe("dic 28, 2025 – ene 3, 2026");
  });

  it("cycleLabel mensual día 1 usa el nombre del mes (con año si no es el actual)", () => {
    const c: PeriodCadence = { type: "monthly", startDay: 1 };
    expect(cycleLabel(c, cycleAtOffset(c, 0, now), now)).toBe("julio");
    expect(cycleLabel(c, cycleAtOffset(c, -7, now), now)).toBe("diciembre 2025");
  });

  it("cycleLabel con desfase o semanal usa el rango", () => {
    const c: PeriodCadence = { type: "monthly", startDay: 18 };
    expect(cycleLabel(c, cycleAtOffset(c, 0, now), now)).toBe("jul 18 – ago 17");
  });
});

describe("vistas", () => {
  const now = d(2026, 7, 20);
  const monthly: PeriodCadence = { type: "monthly", startDay: 1 };
  const all: PeriodCadence = { type: "all" };

  it("la vista predeterminada es el ciclo actual, o todo el tiempo", () => {
    expect(defaultView(monthly)).toEqual({ kind: "cycle", offset: 0 });
    expect(defaultView(all)).toEqual({ kind: "all" });
    expect(isDefaultView({ kind: "cycle", offset: 0 }, monthly)).toBe(true);
    expect(isDefaultView({ kind: "cycle", offset: -1 }, monthly)).toBe(false);
    expect(isDefaultView({ kind: "all" }, monthly)).toBe(false);
    expect(isDefaultView({ kind: "all" }, all)).toBe(true);
  });

  it("con predeterminado 'todo el tiempo', la vista de ciclo usa meses calendario", () => {
    const r = viewRange({ kind: "cycle", offset: 0 }, all, now);
    expect(r && ymd(r.start)).toBe("2026-07-01");
  });

  it("año, todo y rango personalizado", () => {
    const y = viewRange({ kind: "year", year: 2025 }, monthly, now);
    expect(y && [ymd(y.start), ymd(y.end)]).toEqual(["2025-01-01", "2025-12-31"]);
    expect(viewRange({ kind: "all" }, monthly, now)).toBeNull();
    const r = viewRange({ kind: "range", start: "2026-07-20", end: "2026-07-31" }, monthly, now);
    expect(r && [ymd(r.start), ymd(r.end)]).toEqual(["2026-07-20", "2026-07-31"]);
    expect(r?.end.getHours()).toBe(23);
  });

  it("viewLabel", () => {
    expect(viewLabel({ kind: "all" }, monthly, now)).toBe("Todo el tiempo");
    expect(viewLabel({ kind: "year", year: 2026 }, monthly, now)).toBe("2026");
    expect(viewLabel({ kind: "range", start: "2026-07-20", end: "2026-07-31" }, monthly, now)).toBe(
      "jul 20 – 31",
    );
  });
});

describe("filterByRange y sumByRanges", () => {
  const txs = [
    { date: "2026-07-17T23:30:00", amount: 100 },
    { date: "2026-07-18T00:10:00", amount: 50 },
    { date: "2026-08-17T23:59:00", amount: -300 },
    { date: "2026-08-18T08:00:00", amount: 20 },
  ];

  it("incluye el día final completo", () => {
    const r = cycleAtOffset({ type: "monthly", startDay: 18 }, 0, d(2026, 7, 20));
    expect(filterByRange(txs, r).map((t) => t.amount)).toEqual([50, -300]);
    expect(filterByRange(txs, null)).toHaveLength(4);
  });

  it("suma gasto e ingreso por rango (amount > 0 es gasto)", () => {
    const c: PeriodCadence = { type: "monthly", startDay: 18 };
    const ranges = listCycles(c, d(2026, 7, 17), d(2026, 7, 20), 1);
    const sums = sumByRanges(txs, ranges);
    expect(sums).toEqual([
      { expense: 100, income: 0 },
      { expense: 50, income: 300 },
      { expense: 20, income: 0 },
    ]);
  });
});

describe("presupuesto", () => {
  it("sigue el ciclo mensual con desfase; en otras frecuencias usa el mes calendario", () => {
    const now = d(2026, 7, 10);
    expect(ymd(budgetCycle({ type: "monthly", startDay: 18 }, now).start)).toBe("2026-06-18");
    expect(ymd(budgetCycle({ type: "weekly", weekStartsOn: 1 }, now).start)).toBe("2026-07-01");
    expect(ymd(budgetCycle({ type: "all" }, now).start)).toBe("2026-07-01");
    expect(cycleKey(budgetCycle({ type: "monthly", startDay: 18 }, now))).toBe("2026-06-18");
  });
});

describe("expectedPay", () => {
  const now = d(2026, 7, 20);

  it("sin configurar es 0", () => {
    const c: PeriodCadence = { type: "monthly", startDay: 1 };
    expect(expectedPay(c, cycleAtOffset(c, 0, now))).toBe(0);
  });

  it("mensual, semanal y todo el tiempo: un monto por ciclo", () => {
    const monthly: PeriodCadence = { type: "monthly", startDay: 18, pay: 2_600_000 };
    expect(expectedPay(monthly, cycleAtOffset(monthly, -3, now))).toBe(2_600_000);
    const all: PeriodCadence = { type: "all", pay: 3_000_000 };
    expect(expectedPay(all, viewRange({ kind: "cycle", offset: 0 }, all, now)!)).toBe(3_000_000);
  });

  it("varias veces al mes: el monto del día de pago que abre el ciclo", () => {
    const c: PeriodCadence = { type: "semimonthly", days: [1, 16], pay: { "1": 1_300_000, "16": 1_200_000 } };
    expect(expectedPay(c, cycleAtOffset(c, 0, now))).toBe(1_200_000);
    expect(expectedPay(c, cycleAtOffset(c, -1, now))).toBe(1_300_000);
  });
});
