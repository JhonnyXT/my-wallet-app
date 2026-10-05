import type { UserCategory } from "@/src/constants/categoryPresets";
import { applySettingsPatch, type RemoteSettingsState } from "./remoteSettings";
import { withLiveActiveList, type WalletList } from "./slices/listsSlice";
import { EMPTY_TOMBSTONES } from "./slices/tombstonesSlice";

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

const personal: WalletList = {
  id: "personal",
  name: "Personal",
  emoji: "👤",
  period: monthly,
  updatedAt: 0,
};
const viaje: WalletList = {
  id: "viaje",
  name: "Viaje",
  emoji: "✈️",
  period: all,
  categories: [cat("🏨", "Hotel")],
  budgets: { "🏨": 1 },
  updatedAt: 10,
};

function state(over: Partial<RemoteSettingsState> = {}): RemoteSettingsState {
  return {
    lists: [personal, viaje],
    activeListId: "viaje",
    defaultPeriod: all,
    userCategories: [cat("🏨", "Hotel-vivo")],
    budgetByCategory: { "🏨": 99 },
    paymentMethods: [],
    savingsGoals: [],
    debts: [],
    tombstones: EMPTY_TOMBSTONES,
    userName: "",
    darkMode: "system",
    hasCompletedOnboarding: false,
    hasSelectedCategories: false,
    profileUpdatedAt: 0,
    budgetAlertsEnabled: false,
    budgetAlertThreshold: 80,
    settingsUpdatedAt: 0,
    ...over,
  };
}

describe("withLiveActiveList", () => {
  it("la activa lleva sus datos vivos; las demás quedan igual", () => {
    const lists = withLiveActiveList(state());
    expect(lists[1].categories?.map((c) => c.name)).toEqual(["Hotel-vivo"]);
    expect(lists[1].budgets).toEqual({ "🏨": 99 });
    expect(lists[0]).toBe(personal);
  });
});

describe("applySettingsPatch — lista activa", () => {
  it("si la nube gana en la activa, sus datos van a los campos vivos", () => {
    const remoteViaje = {
      ...viaje,
      period: monthly,
      categories: [cat("🍕", "Pizza")],
      budgets: { "🍕": 5 },
      updatedAt: 20,
    };
    const out = applySettingsPatch(state(), {
      lists: { items: [personal, remoteViaje], tombstones: {}, remoteWon: ["viaje"] },
    });
    expect(out.defaultPeriod).toEqual(monthly);
    expect(out.userCategories?.map((c) => c.name)).toEqual(["Pizza"]);
    expect(out.budgetByCategory).toEqual({ "🍕": 5 });
  });

  it("si la nube no gana en la activa, los campos vivos no se tocan", () => {
    const out = applySettingsPatch(state(), {
      lists: { items: [personal, viaje], tombstones: {}, remoteWon: ["personal"] },
    });
    expect(out).not.toHaveProperty("userCategories");
    expect(out).not.toHaveProperty("defaultPeriod");
  });

  it("si la activa llega borrada, vuelve a Personal con sus datos", () => {
    const remotePersonal = { ...personal, categories: [cat("🍔", "Comida")], budgets: { "🍔": 3 } };
    const out = applySettingsPatch(state(), {
      lists: { items: [remotePersonal], tombstones: { viaje: 30 }, remoteWon: ["viaje"] },
    });
    expect(out.activeListId).toBe("personal");
    expect(out.defaultPeriod).toEqual(monthly);
    expect(out.userCategories?.map((c) => c.name)).toEqual(["Comida"]);
    expect(out.budgetByCategory).toEqual({ "🍔": 3 });
    expect(out.tombstones?.lists).toEqual({ viaje: 30 });
  });
});

describe("applySettingsPatch — resto", () => {
  it("colecciones y sus borrados, sin tocar las que no vienen", () => {
    const goal = {
      id: "g",
      name: "Moto",
      emoji: "🏍️",
      targetAmount: 1,
      savedAmount: 0,
      createdAt: "x",
      updatedAt: 5,
    };
    const out = applySettingsPatch(
      state({ tombstones: { ...EMPTY_TOMBSTONES, debts: { d: 1 } } }),
      {
        savingsGoals: { items: [goal], tombstones: { g2: 9 }, remoteWon: ["g"] },
      },
    );
    expect(out.savingsGoals).toEqual([goal]);
    expect(out.tombstones).toEqual({
      ...EMPTY_TOMBSTONES,
      savingsGoals: { g2: 9 },
      debts: { d: 1 },
    });
    expect(out).not.toHaveProperty("debts");
    expect(out).not.toHaveProperty("lists");
  });

  it("perfil: aplica nombre/tema/fecha y marca el onboarding hecho", () => {
    const out = applySettingsPatch(state(), {
      profile: { userName: "Ana", darkMode: "dark", onboardingDone: true, updatedAt: 50 },
    });
    expect(out).toMatchObject({
      userName: "Ana",
      darkMode: "dark",
      profileUpdatedAt: 50,
      hasCompletedOnboarding: true,
      hasSelectedCategories: true,
    });
  });

  it("perfil: la nube no deshace un onboarding ya hecho aquí", () => {
    const out = applySettingsPatch(state({ hasCompletedOnboarding: true }), {
      profile: { userName: "Ana", darkMode: "dark", onboardingDone: false, updatedAt: 50 },
    });
    expect(out).not.toHaveProperty("hasCompletedOnboarding");
  });

  it("ajustes: alertas y umbral", () => {
    const out = applySettingsPatch(state(), {
      settings: { budgetAlertsEnabled: true, budgetAlertThreshold: 70, updatedAt: 8 },
    });
    expect(out).toEqual({
      budgetAlertsEnabled: true,
      budgetAlertThreshold: 70,
      settingsUpdatedAt: 8,
    });
  });

  it("parche vacío no cambia nada", () => {
    expect(applySettingsPatch(state(), {})).toEqual({});
  });
});

// ─── Espacios compartidos (Fase 4) ───────────────────────────────────────────

describe("applySettingsPatch — espacios", () => {
  const link = {
    spaceId: "viaje",
    ownerUid: "uid-ana",
    selfMemberId: "uid-beto",
    sharedUpdatedAt: 5,
  };
  const sharedViaje: WalletList = {
    ...viaje,
    space: link,
    members: [{ id: "uid-ana", name: "Ana", uid: "uid-ana", status: "joined" }],
  };
  const config = {
    kind: "config" as const,
    listId: "viaje",
    name: "Viaje 2",
    emoji: "🏖️",
    categories: [cat("🍹", "Bebidas")],
    showIncome: false,
    sharedUpdatedAt: 50,
  };

  it("lo compartido traído va a la activa y a sus categorías vivas; período y presupuestos no", () => {
    const out = applySettingsPatch(state({ lists: [personal, sharedViaje] }), { spaces: [config] });
    const list = out.lists!.find((l) => l.id === "viaje")!;
    expect(list).toMatchObject({ name: "Viaje 2", emoji: "🏖️", showIncome: false });
    expect(list.space?.sharedUpdatedAt).toBe(50);
    expect(list.updatedAt).toBe(10);
    expect(out.userCategories).toEqual([cat("🍹", "Bebidas")]);
    expect(out.defaultPeriod).toBeUndefined();
    expect(out.budgetByCategory).toBeUndefined();
  });

  it("en una lista no activa no toca los campos vivos", () => {
    const out = applySettingsPatch(
      state({ lists: [personal, sharedViaje], activeListId: "personal" }),
      {
        spaces: [config],
      },
    );
    expect(out.userCategories).toBeUndefined();
    expect(out.lists!.find((l) => l.id === "viaje")!.categories).toEqual(config.categories);
  });

  it("config de una lista que ya no está ligada no se aplica", () => {
    const out = applySettingsPatch(state(), { spaces: [config] });
    expect(out.lists!.find((l) => l.id === "viaje")).toEqual(viaje);
  });

  it("crear agrega la lista del espacio una sola vez; personas y desconectar", () => {
    const nueva: WalletList = { ...sharedViaje, id: "s9", space: { ...link, spaceId: "s9" } };
    const out = applySettingsPatch(state({ lists: [personal, sharedViaje] }), {
      spaces: [
        { kind: "create", list: nueva },
        { kind: "create", list: { ...nueva, name: "duplicada" } },
        { kind: "members", listId: "s9", members: [] },
        { kind: "unlink", listId: "viaje", now: 77 },
      ],
    });
    expect(out.lists!.map((l) => l.id)).toEqual(["personal", "viaje", "s9"]);
    expect(out.lists![2]).toMatchObject({ name: "Viaje", members: [] });
    expect(out.lists![1].space).toBeUndefined();
    expect(out.lists![1].updatedAt).toBe(77);
    expect(out.lists![1].members).toEqual([{ id: "uid-ana", name: "Ana", status: "guest" }]);
  });
});
