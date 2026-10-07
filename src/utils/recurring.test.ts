import { cycleKeyOf, dueRecurring, isDue, nextDueDate, RECURRING_QUEUE_CAP } from "./recurring";
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
