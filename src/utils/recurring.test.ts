import {
  cycleKeyOf,
  describeCadence,
  dueRecurring,
  isDue,
  nextDueDate,
  occurrencesPerMonth,
  RECURRING_QUEUE_CAP,
  REMINDER_DATE_SLOTS,
  summarizeFixedRecurring,
  reminderTriggers,
  upcomingOccurrences,
} from "./recurring";
import type { RecurringExpense } from "@/src/store/slices/recurringSlice";

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day, 12);
const ymd = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function recurring(overrides: Partial<RecurringExpense> = {}): RecurringExpense {
  return {
    id: "r1",
    name: "Arriendo",
    emoji: "🏠",
    amount: 1_200_000,
    isExpense: true,
    categoryEmoji: "🏠",
    paymentMethod: "savings",
    listId: "personal",
    cadence: { type: "monthly", day: 5 },
    amountVaries: false,
    active: true,
    lastHandledCycleKey: null,
    createdAt: "2026-01-01T10:00:00.000",
    updatedAt: 0,
    ...overrides,
  };
}

describe("nextDueDate", () => {
  it("mensual: devuelve el día pedido del mismo mes si todavía no pasó", () => {
    expect(ymd(nextDueDate({ type: "monthly", day: 15 }, d(2026, 7, 1)))).toBe("2026-07-15");
  });

  it("mensual: salta al mes siguiente si el día ya pasó", () => {
    expect(ymd(nextDueDate({ type: "monthly", day: 5 }, d(2026, 7, 20)))).toBe("2026-08-05");
  });

  it("mensual: día 31 se acota al último día real del mes (caso borde)", () => {
    expect(ymd(nextDueDate({ type: "monthly", day: 31 }, d(2026, 4, 1)))).toBe("2026-04-30");
    expect(ymd(nextDueDate({ type: "monthly", day: 31 }, d(2026, 2, 1)))).toBe("2026-02-28");
  });

  it("semanal: hoy mismo si el día de la semana coincide", () => {
    // 2026-07-01 es miércoles (weekday 3)
    expect(ymd(nextDueDate({ type: "weekly", weekday: 3 }, d(2026, 7, 1)))).toBe("2026-07-01");
  });

  it("semanal: cruza fin de año sin romperse", () => {
    // 2026-12-30 es miércoles; el próximo domingo (weekday 0) es 2027-01-03
    expect(ymd(nextDueDate({ type: "weekly", weekday: 0 }, d(2026, 12, 30)))).toBe("2027-01-03");
  });
});

describe("dueRecurring", () => {
  it("recién creado, aún no vence: cola vacía", () => {
    const r = recurring({
      cadence: { type: "monthly", day: 20 },
      createdAt: "2026-07-01T10:00:00.000",
    });
    const { queue } = dueRecurring([r], d(2026, 7, 10));
    expect(queue).toEqual([]);
  });

  it("pausado: nunca aparece, aunque la fecha ya haya pasado", () => {
    const r = recurring({
      active: false,
      cadence: { type: "monthly", day: 5 },
      createdAt: "2026-01-01T10:00:00.000",
    });
    const { queue } = dueRecurring([r], d(2026, 7, 20));
    expect(queue).toEqual([]);
  });

  it("ya confirmado este ciclo: no reaparece", () => {
    const r = recurring({
      cadence: { type: "monthly", day: 5 },
      createdAt: "2026-01-01T10:00:00.000",
      lastHandledCycleKey: "2026-07-05",
    });
    const { queue } = dueRecurring([r], d(2026, 7, 20));
    expect(queue).toEqual([]);
  });

  it("vencido sin confirmar: aparece con la fecha real de vencimiento, no la de hoy", () => {
    const r = recurring({
      cadence: { type: "monthly", day: 5 },
      createdAt: "2026-01-01T10:00:00.000",
      lastHandledCycleKey: "2026-06-05",
    });
    const { queue } = dueRecurring([r], d(2026, 7, 20));
    expect(queue).toHaveLength(1);
    expect(ymd(queue[0].dueDate)).toBe("2026-07-05");
    expect(queue[0].cycleKey).toBe(cycleKeyOf(queue[0].dueDate));
  });

  it("más de RECURRING_QUEUE_CAP ciclos vencidos: se topa, y los más viejos quedan para auto-omitir", () => {
    const r = recurring({
      cadence: { type: "monthly", day: 5 },
      createdAt: "2025-01-01T10:00:00.000",
      lastHandledCycleKey: null,
    });
    // 10 meses vencidos (ene-oct 2025) vistos desde noviembre de 2025
    const { queue, autoSkip } = dueRecurring([r], d(2025, 11, 1));
    expect(queue).toHaveLength(RECURRING_QUEUE_CAP);
    expect(queue.map((o) => ymd(o.dueDate))).toEqual([
      "2025-05-05",
      "2025-06-05",
      "2025-07-05",
      "2025-08-05",
      "2025-09-05",
      "2025-10-05",
    ]);
    expect(autoSkip["r1"]).toBe("2025-04-05");
  });
});

describe("isDue", () => {
  it("false para un recurrente pausado", () => {
    expect(
      isDue(recurring({ active: false, cadence: { type: "monthly", day: 1 } }), d(2026, 7, 20)),
    ).toBe(false);
  });

  it("true cuando hay una ocurrencia vencida sin confirmar", () => {
    const r = recurring({
      cadence: { type: "monthly", day: 5 },
      lastHandledCycleKey: "2026-06-05",
    });
    expect(isDue(r, d(2026, 7, 20))).toBe(true);
  });
});

describe("cadencia quincenal (cada 14 días desde un ancla)", () => {
  const cadence = { type: "biweekly" as const, anchor: "2026-07-03" };

  it("antes o en el ancla devuelve el ancla", () => {
    expect(ymd(nextDueDate(cadence, d(2026, 7, 1)))).toBe("2026-07-03");
    expect(ymd(nextDueDate(cadence, d(2026, 7, 3)))).toBe("2026-07-03");
  });

  it("después del ancla salta de 14 en 14", () => {
    expect(ymd(nextDueDate(cadence, d(2026, 7, 4)))).toBe("2026-07-17");
    expect(ymd(nextDueDate(cadence, d(2026, 7, 17)))).toBe("2026-07-17");
    expect(ymd(nextDueDate(cadence, d(2026, 7, 18)))).toBe("2026-07-31");
  });

  it("cruza meses y años sin desfasarse", () => {
    // Desde el 3 de julio: ... 4 dic, 18 dic, 1 ene, 15 ene.
    expect(ymd(nextDueDate(cadence, d(2026, 12, 5)))).toBe("2026-12-18");
    expect(ymd(nextDueDate(cadence, d(2026, 12, 20)))).toBe("2027-01-01");
    expect(ymd(nextDueDate(cadence, d(2027, 1, 2)))).toBe("2027-01-15");
  });

  it("no se desfasa con el cambio de hora (marzo y noviembre)", () => {
    const c = { type: "biweekly" as const, anchor: "2026-01-02" };
    for (const [y, m, day] of [
      [2026, 3, 15],
      [2026, 11, 10],
    ]) {
      const next = nextDueDate(c, d(y, m, day));
      expect(next.getDay()).toBe(5); // siempre viernes, como el ancla
    }
  });

  it("cada ocurrencia cae a 14 días de la anterior", () => {
    const occ = upcomingOccurrences(cadence, d(2026, 7, 1), 4).map(ymd);
    expect(occ).toEqual(["2026-07-03", "2026-07-17", "2026-07-31", "2026-08-14"]);
  });
});

describe("cadencia dos veces al mes", () => {
  const cadence = { type: "semimonthly" as const, days: [15, 30] as [number, number] };

  it("elige el siguiente día del mismo mes", () => {
    expect(ymd(nextDueDate(cadence, d(2026, 7, 1)))).toBe("2026-07-15");
    expect(ymd(nextDueDate(cadence, d(2026, 7, 16)))).toBe("2026-07-30");
  });

  it("pasa al primer día del mes siguiente cuando ya pasaron los dos", () => {
    expect(ymd(nextDueDate(cadence, d(2026, 7, 31)))).toBe("2026-08-15");
    expect(ymd(nextDueDate(cadence, d(2026, 12, 31)))).toBe("2027-01-15");
  });

  it("el día 30 y 31 se acotan al último día real (febrero y meses de 30)", () => {
    const last = { type: "semimonthly" as const, days: [1, 31] as [number, number] };
    expect(ymd(nextDueDate(last, d(2026, 2, 2)))).toBe("2026-02-28");
    expect(ymd(nextDueDate(last, d(2026, 4, 2)))).toBe("2026-04-30");
  });

  it("dos días que se acotan al mismo día no repiten la fecha", () => {
    const both = { type: "semimonthly" as const, days: [30, 31] as [number, number] };
    const occ = upcomingOccurrences(both, d(2026, 2, 1), 3).map(ymd);
    expect(occ).toEqual(["2026-02-28", "2026-03-30", "2026-03-31"]);
  });

  it("la cola de vencidos lista cada quincena una vez", () => {
    const r = recurring({ cadence, createdAt: "2026-06-01T10:00:00.000" });
    const { queue } = dueRecurring([r], d(2026, 7, 31));
    expect(queue.map((q) => q.cycleKey)).toEqual([
      "2026-06-15",
      "2026-06-30",
      "2026-07-15",
      "2026-07-30",
    ]);
  });
});

describe("cadencia quincenal en la cola de vencidos", () => {
  it("lista cada ocurrencia desde que se creó y respeta lo ya manejado", () => {
    const r = recurring({
      cadence: { type: "biweekly", anchor: "2026-07-03" },
      createdAt: "2026-07-01T10:00:00.000",
      lastHandledCycleKey: "2026-07-17",
    });
    const { queue } = dueRecurring([r], d(2026, 8, 20));
    expect(queue.map((q) => q.cycleKey)).toEqual(["2026-07-31", "2026-08-14"]);
  });
});

describe("occurrencesPerMonth y describeCadence", () => {
  it("promedia las ocurrencias por mes de cada cadencia", () => {
    expect(occurrencesPerMonth({ type: "monthly", day: 1 })).toBe(1);
    expect(occurrencesPerMonth({ type: "semimonthly", days: [1, 15] })).toBe(2);
    expect(occurrencesPerMonth({ type: "weekly", weekday: 1 })).toBeCloseTo(4.333, 2);
    expect(occurrencesPerMonth({ type: "biweekly", anchor: "2026-07-03" })).toBeCloseTo(2.167, 2);
  });

  it("describe cada cadencia en español", () => {
    expect(describeCadence({ type: "monthly", day: 5 })).toBe("Cada mes, día 5");
    expect(describeCadence({ type: "semimonthly", days: [15, 30] })).toBe("Días 15 y 30 de cada mes");
    expect(describeCadence({ type: "biweekly", anchor: "2026-07-03" })).toMatch(/^Cada 2 semanas, /);
  });
});

describe("reminderTriggers", () => {
  it("semanal y mensual usan un trigger nativo repetido", () => {
    expect(reminderTriggers({ type: "weekly", weekday: 5 }, d(2026, 7, 1))).toEqual([
      { kind: "weekly", weekday: 5 },
    ]);
    expect(reminderTriggers({ type: "monthly", day: 5 }, d(2026, 7, 1))).toEqual([
      { kind: "monthly", day: 5 },
    ]);
  });

  it("dos veces al mes usa dos triggers mensuales", () => {
    expect(reminderTriggers({ type: "semimonthly", days: [15, 30] }, d(2026, 7, 1))).toEqual([
      { kind: "monthly", day: 15 },
      { kind: "monthly", day: 30 },
    ]);
  });

  it("quincenal programa las próximas fechas futuras a las 9:00", () => {
    const cadence = { type: "biweekly" as const, anchor: "2026-07-03" };
    const out = reminderTriggers(cadence, d(2026, 7, 1));
    expect(out).toHaveLength(REMINDER_DATE_SLOTS);
    const dates = out.map((t) => (t.kind === "date" ? t.date : null));
    expect(dates.map((x) => ymd(x!))).toEqual(["2026-07-03", "2026-07-17", "2026-07-31", "2026-08-14"]);
    expect(dates.every((x) => x!.getHours() === 9)).toBe(true);
  });

  it("quincenal omite la ocurrencia de hoy si las 9:00 ya pasaron", () => {
    const cadence = { type: "biweekly" as const, anchor: "2026-07-03" };
    const afterNine = new Date(2026, 6, 3, 15, 0);
    const first = reminderTriggers(cadence, afterNine)[0];
    expect(first.kind === "date" && ymd(first.date)).toBe("2026-07-17");
  });
});

describe("summarizeFixedRecurring", () => {
  const rent = recurring({ id: "rent", amount: 1_000_000, cadence: { type: "monthly", day: 1 } });
  const gym = recurring({ id: "gym", amount: 100_000, cadence: { type: "semimonthly", days: [1, 15] } });
  const market = recurring({ id: "market", amount: 100_000, cadence: { type: "weekly", weekday: 6 } });
  const salary = recurring({ id: "salary", amount: 3_000_000, isExpense: false });

  it("lleva cada cadencia a su equivalente mensual y ordena de mayor a menor", () => {
    const out = summarizeFixedRecurring([gym, market, rent], true, "personal");
    expect(out.items.map((i) => [i.recurring.id, i.monthly])).toEqual([
      ["rent", 1_000_000],
      ["market", 433_333],
      ["gym", 200_000],
    ]);
    expect(out.monthlyTotal).toBe(1_633_333);
  });

  it("separa gastos de ingresos", () => {
    expect(summarizeFixedRecurring([rent, salary], false, "personal").monthlyTotal).toBe(3_000_000);
    expect(summarizeFixedRecurring([rent, salary], true, "personal").monthlyTotal).toBe(1_000_000);
  });

  it("ignora los pausados y los de otra lista", () => {
    const paused = recurring({ id: "p", active: false });
    const other = recurring({ id: "o", listId: "viaje" });
    expect(summarizeFixedRecurring([paused, other], true, "personal")).toEqual({
      monthlyTotal: 0,
      items: [],
    });
  });
});
