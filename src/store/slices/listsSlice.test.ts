import type { UserCategory } from "@/src/constants/categoryPresets";
import {
  mergeSpaceMembers,
  swapActiveList,
  touchList,
  unlinkedList,
  withLiveActiveList,
  type ListMember,
  type WalletList,
} from "./listsSlice";

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

// ─── Espacios compartidos (Sync Fase 4) ──────────────────────────────────────

const space = {
  spaceId: "viaje",
  ownerUid: "uid-ana",
  selfMemberId: "uid-ana",
  sharedUpdatedAt: 5,
};
const shared = (): WalletList => ({
  id: "viaje",
  name: "Viaje",
  emoji: "✈️",
  period: all,
  categories: [cat("🏨", "Hotel")],
  updatedAt: 10,
  space,
  members: [
    { id: "uid-beto", name: "Beto", uid: "uid-beto", status: "joined" },
    { id: "m_luis", name: "Luis", uid: null, status: "guest" },
  ],
});

describe("touchList en una lista compartida", () => {
  it("lo compartido mueve también sharedUpdatedAt", () => {
    const [out] = touchList([shared()], "viaje", 500, true);
    expect(out.updatedAt).toBe(500);
    expect(out.space?.sharedUpdatedAt).toBe(500);
  });

  it("período y presupuestos (no compartidos) solo mueven updatedAt", () => {
    const [out] = touchList([shared()], "viaje", 500);
    expect(out.updatedAt).toBe(500);
    expect(out.space?.sharedUpdatedAt).toBe(5);
  });

  it("en una lista propia, compartido o no da igual: sin space", () => {
    const own: WalletList = { id: "casa", name: "Casa", emoji: "🏠", period: all, updatedAt: 1 };
    const [out] = touchList([own], "casa", 500, true);
    expect(out).toEqual({ ...own, updatedAt: 500 });
    expect("space" in out).toBe(false);
  });
});

describe("el intercambio conserva el espacio y el estado de las personas", () => {
  it("swapActiveList ida y vuelta y withLiveActiveList", () => {
    const state = baseState([
      { id: "personal", name: "Personal", emoji: "👤", period: monthly, updatedAt: 0 },
      shared(),
    ]);
    const there = swapActiveList(state, "viaje")!;
    expect(withLiveActiveList(there)[1].space).toEqual(space);
    const back = swapActiveList(there, "personal")!;
    expect(back.lists[1].space).toEqual(space);
    expect(back.lists[1].members).toEqual(shared().members);
  });
});

describe("mergeSpaceMembers", () => {
  const prev: ListMember[] = shared().members!;

  it("quitar a una persona sin app la deja 'left'; agregar una nueva es 'guest'", () => {
    const out = mergeSpaceMembers(prev, [
      { id: "uid-beto", name: "Beto" },
      { id: "m_dani", name: "Dani" },
    ]);
    expect(out).toEqual([
      { id: "uid-beto", name: "Beto", uid: "uid-beto", status: "joined" },
      { id: "m_dani", name: "Dani", uid: null, status: "guest" },
      { id: "m_luis", name: "Luis", uid: null, status: "left" },
    ]);
  });

  it("renombrar conserva estado y uid; quien se unió no se quita desde aquí", () => {
    const out = mergeSpaceMembers(prev, [{ id: "m_luis", name: "Luis F." }]);
    expect(out).toEqual([
      { id: "m_luis", name: "Luis F.", uid: null, status: "guest" },
      { id: "uid-beto", name: "Beto", uid: "uid-beto", status: "joined" },
    ]);
  });
});

describe("unlinkedList", () => {
  it("queda como lista propia: sin space, todos sin app, los que salieron siguen 'left'", () => {
    const list = shared();
    list.members!.push({ id: "uid-caro", name: "Caro", uid: "uid-caro", status: "left" });
    const out = unlinkedList(list, 900);
    expect("space" in out).toBe(false);
    expect(out.updatedAt).toBe(900);
    expect(out.members).toEqual([
      { id: "uid-beto", name: "Beto", status: "guest" },
      { id: "m_luis", name: "Luis", status: "guest" },
      { id: "uid-caro", name: "Caro", status: "left" },
    ]);
    expect(out.categories).toEqual(list.categories);
  });
});
