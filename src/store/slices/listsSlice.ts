import type { StateCreator } from "zustand";
import type { UserCategory } from "@/src/constants/categoryPresets";
import { DEFAULT_LIST_ID } from "@/src/constants/lists";
import { DEFAULT_CADENCE, type PeriodCadence } from "@/src/utils/periodCycles";
import { newId } from "@/src/utils/ids";
import { addTombstone, type TombstonesSlice } from "./tombstonesSlice";
import type { BudgetSlice } from "./budgetSlice";
import type { CategoriesSlice } from "./categoriesSlice";
import type { PrefsSlice } from "./prefsSlice";

/** Otra persona de una lista (tu pareja, un socio…). Tú no estás aquí: eres `paid_by = ""`. */
export interface ListMember {
  id: string;
  name: string;
}

export interface WalletList {
  id: string;
  name: string;
  emoji: string;
  /** Las demás personas de la lista (Personal no tiene). Opcional: listas viejas no lo traen. */
  members?: ListMember[];
  /**
   * Período guardado de la lista. El de la lista ACTIVA vive en `defaultPeriod`
   * (prefsSlice), que es lo que leen el Dashboard, el presupuesto y "Pago y período";
   * al cambiar de lista se intercambian. Así cada lista tiene su propio período sin
   * tocar a los consumidores de `defaultPeriod`.
   */
  period: PeriodCadence;
  /**
   * Categorías y presupuestos guardados de la lista, con el mismo intercambio que `period`:
   * los de la activa viven en `userCategories`/`budgetByCategory` (lo que lee toda la app).
   * Opcionales: una lista sin categorías recibe una copia de las de Personal al entrar.
   */
  categories?: UserCategory[];
  budgets?: Record<string, number>;
  /** false = la lista es solo de gastos: se ocultan sus ingresos. Por defecto true. */
  showIncome?: boolean;
  /**
   * Última edición, epoch ms (sync). En la lista activa también la mueven los cambios de
   * `defaultPeriod`/`userCategories`/`budgetByCategory` (ver `touchList`).
   */
  updatedAt: number;
}

/**
 * Las listas con los datos VIVOS de la activa (su período, categorías y presupuestos reales viven
 * en `defaultPeriod`/`userCategories`/`budgetByCategory`). Es lo que se respalda: la copia en
 * `lists[]` de la activa está desactualizada.
 */
export function withLiveActiveList(state: SwapState): WalletList[] {
  return state.lists.map((l) =>
    l.id === state.activeListId
      ? {
          ...l,
          period: state.defaultPeriod,
          categories: state.userCategories,
          budgets: state.budgetByCategory,
        }
      : l,
  );
}

/** Marca una lista como editada ahora. */
export function touchList(lists: WalletList[], id: string, now: number): WalletList[] {
  return lists.map((l) => (l.id === id ? { ...l, updatedAt: now } : l));
}

/** Lo que se intercambia al cambiar de lista. */
type SwapState = Pick<ListsSlice, "lists" | "activeListId"> &
  Pick<PrefsSlice, "defaultPeriod"> &
  Pick<CategoriesSlice, "userCategories"> &
  Pick<BudgetSlice, "budgetByCategory">;

/**
 * Cambia la lista activa: guarda en la saliente su período, categorías y presupuestos, y
 * carga los de la entrante. Una lista que nunca tuvo categorías recibe una copia de las de
 * Personal (vacía no se podría registrar nada). Devuelve null si no hay nada que cambiar.
 * Cambiar de lista no es editarla: `updatedAt` solo se mueve en la entrante que recibe esa copia.
 */
export function swapActiveList(
  state: SwapState,
  id: string,
  now: number = Date.now(),
): SwapState | null {
  const { lists, activeListId } = state;
  const target = lists.find((l) => l.id === id);
  if (!target || id === activeListId) return null;

  const saved = lists.map((l) =>
    l.id === activeListId
      ? {
          ...l,
          period: state.defaultPeriod,
          categories: state.userCategories,
          budgets: state.budgetByCategory,
        }
      : l,
  );
  const personalCats =
    activeListId === DEFAULT_LIST_ID
      ? state.userCategories
      : (saved.find((l) => l.id === DEFAULT_LIST_ID)?.categories ?? state.userCategories);
  const categories = target.categories ?? personalCats;
  const updatedAt = target.categories ? target.updatedAt : now;

  return {
    lists: saved.map((l) => (l.id === id ? { ...l, categories, updatedAt } : l)),
    activeListId: id,
    defaultPeriod: target.period,
    userCategories: categories,
    budgetByCategory: target.budgets ?? {},
  };
}

export interface ListsSlice {
  lists: WalletList[];
  activeListId: string;

  /** Crea una lista (período "Todo el tiempo", sus categorías) y devuelve su id (no la activa). */
  addList: (name: string, emoji: string, categories: UserCategory[]) => string;
  /** Mostrar u ocultar los ingresos de una lista. */
  setShowIncome: (listId: string, show: boolean) => void;
  editList: (id: string, name: string, emoji: string) => void;
  /** Quita la lista de los ajustes; borrar sus transacciones es cosa del llamador. */
  removeList: (id: string) => void;
  /** Cambia la lista activa; recargar las transacciones es cosa del llamador. */
  switchList: (id: string) => void;
  /** Reemplaza los miembros. No quitar a quien tiene movimientos es cosa del llamador. */
  setMembers: (listId: string, members: ListMember[]) => void;
}

const PERSONAL_LIST: WalletList = {
  id: DEFAULT_LIST_ID,
  name: "Personal",
  emoji: "👤",
  period: DEFAULT_CADENCE,
  // Igual en todos los teléfonos: con 0, cualquier edición real gana al unir.
  updatedAt: 0,
};

export const createListsSlice: StateCreator<
  ListsSlice & PrefsSlice & CategoriesSlice & BudgetSlice & TombstonesSlice,
  [],
  [],
  ListsSlice
> = (set, get) => ({
  lists: [PERSONAL_LIST],
  activeListId: DEFAULT_LIST_ID,

  addList: (name, emoji, categories) => {
    const id = newId();
    set((s) => ({
      lists: [
        ...s.lists,
        {
          id,
          name,
          emoji,
          period: { type: "all" },
          categories,
          budgets: {},
          showIncome: true,
          updatedAt: Date.now(),
        },
      ],
    }));
    return id;
  },

  setShowIncome: (listId, show) =>
    set((s) => ({
      lists: s.lists.map((l) =>
        l.id === listId ? { ...l, showIncome: show, updatedAt: Date.now() } : l,
      ),
    })),

  editList: (id, name, emoji) =>
    set((s) => ({
      lists: s.lists.map((l) => (l.id === id ? { ...l, name, emoji, updatedAt: Date.now() } : l)),
    })),

  removeList: (id) => {
    if (id === DEFAULT_LIST_ID) return;
    if (get().activeListId === id) get().switchList(DEFAULT_LIST_ID);
    set((s) => ({
      lists: s.lists.filter((l) => l.id !== id),
      tombstones: addTombstone(s.tombstones, "lists", id, Date.now()),
    }));
  },

  setMembers: (listId, members) => {
    if (listId === DEFAULT_LIST_ID) return;
    set((s) => ({
      lists: s.lists.map((l) => (l.id === listId ? { ...l, members, updatedAt: Date.now() } : l)),
    }));
  },

  switchList: (id) => {
    const next = swapActiveList(get(), id);
    if (next) set(next);
  },
});

/**
 * Período, categorías y presupuestos guardados de la lista activa están desactualizados: los
 * reales son `defaultPeriod`, `userCategories` y `budgetByCategory`.
 */
export function getActiveList(state: ListsSlice): WalletList {
  return state.lists.find((l) => l.id === state.activeListId) ?? state.lists[0] ?? PERSONAL_LIST;
}
