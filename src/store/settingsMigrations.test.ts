import { migrateSettings } from "./settingsMigrations";
import { EMPTY_TOMBSTONES } from "./slices/tombstonesSlice";

const NOW = 1_790_000_000_000;

// Forma real de `mywallet-settings` en v1 (datos inventados).
function v1State() {
  return {
    userName: "Ana",
    darkMode: "dark",
    biometricLockEnabled: true,
    defaultPeriod: { type: "monthly", startDay: 15, pay: 3000000 },
    userCategories: [{ id: "food", emoji: "🍔", name: "Comida", type: "expense" }],
    budgetByCategory: { "🍔": 500000 },
    hasSelectedCategories: true,
    hasCompletedOnboarding: true,
    onboardingStep: 5,
    lists: [
      { id: "personal", name: "Personal", emoji: "👤", period: { type: "monthly", startDay: 1 } },
      {
        id: "list_1759000000000",
        name: "Viaje",
        emoji: "✈️",
        period: { type: "all" },
        members: [{ id: "m_1759000000001", name: "Juan" }],
        budgets: {},
        showIncome: false,
      },
    ],
    activeListId: "list_1759000000000",
    paymentMethods: [
      { id: "cash", name: "Efectivo", type: "cash" },
      { id: "1759000000002", name: "Nu", type: "debit", emoji: "💜" },
    ],
    savingsGoals: [
      {
        id: "1759000000003",
        name: "Moto",
        emoji: "🏍️",
        targetAmount: 8000000,
        savedAmount: 1000000,
        createdAt: "2026-09-01T10:00:00.000",
      },
    ],
    debts: [
      {
        id: "1759000000004",
        name: "Tarjeta",
        emoji: "💳",
        totalAmount: 2000000,
        remainingAmount: 1500000,
        monthlyPayment: 200000,
        dueDay: 5,
        createdAt: "2026-09-01T10:00:00.000",
      },
    ],
    budgetAlertsEnabled: true,
    budgetNotifiedMonth: { "list_1759000000000|🍔:threshold": "2026-09-15" },
  };
}

describe("migrateSettings v1 → v2", () => {
  it("agrega updatedAt a cada ítem sincronizable y el registro de borrados", () => {
    const out = migrateSettings(v1State(), 1, NOW);
    for (const key of ["lists", "paymentMethods", "savingsGoals", "debts"]) {
      for (const item of out[key] as { updatedAt: number }[]) {
        expect(item.updatedAt).toBe(NOW);
      }
    }
    expect(out.tombstones).toEqual(EMPTY_TOMBSTONES);
  });

  it("no cambia nada más: ids, datos y el resto del estado quedan iguales", () => {
    const input = v1State();
    const out = migrateSettings(input, 1, NOW);
    const strip = (items: unknown) =>
      (items as Record<string, unknown>[]).map(({ updatedAt: _u, ...rest }) => rest);
    expect(strip(out.lists)).toEqual(input.lists);
    expect(strip(out.paymentMethods)).toEqual(input.paymentMethods);
    expect(strip(out.savingsGoals)).toEqual(input.savingsGoals);
    expect(strip(out.debts)).toEqual(input.debts);
    const { lists, paymentMethods, savingsGoals, debts, tombstones, ...rest } = out;
    const { lists: _l, paymentMethods: _p, savingsGoals: _s, debts: _d, ...inputRest } = input;
    expect(rest).toEqual(inputRest);
  });

  it("no muta el estado recibido", () => {
    const input = v1State();
    migrateSettings(input, 1, NOW);
    expect(input).toEqual(v1State());
  });

  it("conserva un updatedAt ya presente y un registro de borrados existente", () => {
    const input = {
      ...v1State(),
      debts: [{ ...v1State().debts[0], updatedAt: 5 }],
      tombstones: { ...EMPTY_TOMBSTONES, debts: { x: 1 } },
    };
    const out = migrateSettings(input, 1, NOW);
    expect((out.debts as { updatedAt: number }[])[0].updatedAt).toBe(5);
    expect(out.tombstones).toEqual({ ...EMPTY_TOMBSTONES, debts: { x: 1 } });
  });

  it("tolera colecciones ausentes (estado parcial)", () => {
    const out = migrateSettings({ userName: "Ana" }, 1, NOW);
    expect(out).toEqual({ userName: "Ana", tombstones: EMPTY_TOMBSTONES });
  });

  it("un estado ya en v2 queda igual", () => {
    const v2 = migrateSettings(v1State(), 1, NOW);
    expect(migrateSettings(v2, 2, NOW + 1000)).toEqual(v2);
  });
});

describe("migrateSettings v0 → v2", () => {
  it("pasa monthlyBudget al pago del período y además agrega updatedAt", () => {
    const { defaultPeriod: _p, ...rest } = v1State();
    const out = migrateSettings(
      { ...rest, defaultPeriod: { type: "monthly", startDay: 1 }, monthlyBudget: 2500000 },
      0,
      NOW,
    );
    expect(out.defaultPeriod).toEqual({ type: "monthly", startDay: 1, pay: 2500000 });
    expect(out.monthlyBudget).toBeUndefined();
    expect((out.lists as { updatedAt: number }[])[0].updatedAt).toBe(NOW);
    expect(out.tombstones).toEqual(EMPTY_TOMBSTONES);
  });
});
