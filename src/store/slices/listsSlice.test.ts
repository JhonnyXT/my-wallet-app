import type { UserCategory } from "@/src/constants/categoryPresets";
import { swapActiveList, type WalletList } from "./listsSlice";

const cat = (emoji: string, name: string): UserCategory => ({
  id: name,
  emoji,
  name,
  colorBg: "#fff",
  colorAccent: "#000",
  type: "expense",
  keywords: [],
  isPreset: false,
});

const monthly = { type: "monthly", startDay: 1 } as const;
const all = { type: "all" } as const;

function baseState(lists: WalletList[]) {
  return {
    lists,
    activeListId: "personal",
    defaultPeriod: monthly,
    userCategories: [cat("🍔", "Comida")],
    budgetByCategory: { "🍔": 500000 },
  };
}

describe("swapActiveList", () => {
  it("guarda lo de la saliente y carga lo de la entrante", () => {
    const state = baseState([
      { id: "personal", name: "Personal", emoji: "👤", period: monthly },
      {
        id: "viaje",
        name: "Viaje",
        emoji: "✈️",
        period: all,
        categories: [cat("🏨", "Hotel")],
        budgets: { "🏨": 900000 },
      },
    ]);
    const next = swapActiveList(state, "viaje")!;
    expect(next.activeListId).toBe("viaje");
    expect(next.defaultPeriod).toEqual(all);
    expect(next.userCategories.map((c) => c.name)).toEqual(["Hotel"]);
    expect(next.budgetByCategory).toEqual({ "🏨": 900000 });
    const personal = next.lists.find((l) => l.id === "personal")!;
    expect(personal.categories?.map((c) => c.name)).toEqual(["Comida"]);
    expect(personal.budgets).toEqual({ "🍔": 500000 });
    expect(personal.period).toEqual(monthly);
  });

  it("una lista sin categorías recibe una copia de las de Personal y presupuestos vacíos", () => {
    const state = baseState([
      { id: "personal", name: "Personal", emoji: "👤", period: monthly },
      { id: "vieja", name: "Vieja", emoji: "⛱️", period: all },
    ]);
    const next = swapActiveList(state, "vieja")!;
    expect(next.userCategories.map((c) => c.name)).toEqual(["Comida"]);
    expect(next.budgetByCategory).toEqual({});
    expect(next.lists.find((l) => l.id === "vieja")!.categories?.map((c) => c.name)).toEqual([
      "Comida",
    ]);
  });

  it("ida y vuelta conserva todo", () => {
    const state = baseState([
      { id: "personal", name: "Personal", emoji: "👤", period: monthly },
      { id: "viaje", name: "Viaje", emoji: "✈️", period: all, categories: [cat("🏨", "Hotel")] },
    ]);
    const there = swapActiveList(state, "viaje")!;
    const back = swapActiveList(there, "personal")!;
    expect(back.userCategories.map((c) => c.name)).toEqual(["Comida"]);
    expect(back.budgetByCategory).toEqual({ "🍔": 500000 });
    expect(back.defaultPeriod).toEqual(monthly);
  });

  it("misma lista o lista inexistente no cambia nada", () => {
    const state = baseState([{ id: "personal", name: "Personal", emoji: "👤", period: monthly }]);
    expect(swapActiveList(state, "personal")).toBeNull();
    expect(swapActiveList(state, "nope")).toBeNull();
  });
});
