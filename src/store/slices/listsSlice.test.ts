import type { UserCategory } from "@/src/constants/categoryPresets";
import { swapActiveList, touchList, type WalletList } from "./listsSlice";

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
      { id: "personal", name: "Personal", emoji: "👤", period: monthly, updatedAt: 0 },
      {
        id: "viaje",
        name: "Viaje",
        emoji: "✈️",
        period: all,
        categories: [cat("🏨", "Hotel")],
        budgets: { "🏨": 900000 },
        updatedAt: 10,
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
      { id: "personal", name: "Personal", emoji: "👤", period: monthly, updatedAt: 0 },
      { id: "vieja", name: "Vieja", emoji: "⛱️", period: all, updatedAt: 10 },
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
      { id: "personal", name: "Personal", emoji: "👤", period: monthly, updatedAt: 0 },
      {
        id: "viaje",
        name: "Viaje",
        emoji: "✈️",
        period: all,
        categories: [cat("🏨", "Hotel")],
        updatedAt: 10,
      },
    ]);
    const there = swapActiveList(state, "viaje")!;
    const back = swapActiveList(there, "personal")!;
    expect(back.userCategories.map((c) => c.name)).toEqual(["Comida"]);
    expect(back.budgetByCategory).toEqual({ "🍔": 500000 });
    expect(back.defaultPeriod).toEqual(monthly);
  });

  it("misma lista o lista inexistente no cambia nada", () => {
    const state = baseState([
      { id: "personal", name: "Personal", emoji: "👤", period: monthly, updatedAt: 0 },
    ]);
    expect(swapActiveList(state, "personal")).toBeNull();
    expect(swapActiveList(state, "nope")).toBeNull();
  });

  it("cambiar de lista no marca ninguna como editada", () => {
    const state = baseState([
      { id: "personal", name: "Personal", emoji: "👤", period: monthly, updatedAt: 0 },
      {
        id: "viaje",
        name: "Viaje",
        emoji: "✈️",
        period: all,
        categories: [cat("🏨", "Hotel")],
        updatedAt: 10,
      },
    ]);
    const there = swapActiveList(state, "viaje", 999)!;
    const back = swapActiveList(there, "personal", 1999)!;
    expect(back.lists.map((l) => l.updatedAt)).toEqual([0, 10]);
  });

  it("la entrante sin categorías queda editada (recibió la copia de Personal)", () => {
    const state = baseState([
      { id: "personal", name: "Personal", emoji: "👤", period: monthly, updatedAt: 0 },
      { id: "vieja", name: "Vieja", emoji: "⛱️", period: all, updatedAt: 10 },
    ]);
    const next = swapActiveList(state, "vieja", 999)!;
    expect(next.lists.find((l) => l.id === "vieja")!.updatedAt).toBe(999);
    expect(next.lists.find((l) => l.id === "personal")!.updatedAt).toBe(0);
  });
});

describe("touchList", () => {
  it("mueve solo el updatedAt de la lista indicada", () => {
    const lists: WalletList[] = [
      { id: "personal", name: "Personal", emoji: "👤", period: monthly, updatedAt: 0 },
      { id: "viaje", name: "Viaje", emoji: "✈️", period: all, updatedAt: 10 },
    ];
    const out = touchList(lists, "viaje", 500);
    expect(out.map((l) => l.updatedAt)).toEqual([0, 500]);
    expect(lists[1].updatedAt).toBe(10);
  });
});
