/**
 * Aplicar al store lo traído de la nube (sync Fase 3). Pura: recibe el estado y lo ya unido por
 * `src/sync/merge.ts`, devuelve el parche. No mueve ninguna fecha de edición (lo traído no es una
 * edición de este teléfono y no debe volver a subirse).
 *
 * Cuidado con la lista activa (patrón de intercambio, ver listsSlice): si la nube trae una versión
 * más nueva de ella, su período/categorías/presupuestos van a `defaultPeriod`/`userCategories`/
 * `budgetByCategory`, que es lo que lee la app; si la activa llega borrada, se vuelve a Personal.
 */
import { DEFAULT_LIST_ID } from "@/src/constants/lists";
import type { UserCategory } from "@/src/constants/categoryPresets";
import type { PeriodCadence } from "@/src/utils/periodCycles";
import { unlinkedList, type ListMember, type WalletList } from "./slices/listsSlice";
import type { PaymentMethod } from "./slices/paymentsSlice";
import type { SavingsGoal } from "./slices/goalsSlice";
import type { Debt } from "./slices/debtsSlice";
import type { DarkModeOption } from "./slices/prefsSlice";
import type { Tombstones } from "./slices/tombstonesSlice";

interface MergedCollection<T> {
  items: T[];
  tombstones: Record<string, number>;
  /** Ids donde ganó la nube. */
  remoteWon: string[];
}

export interface RemoteSettingsPatch {
  lists?: MergedCollection<WalletList>;
  paymentMethods?: MergedCollection<PaymentMethod>;
  savingsGoals?: MergedCollection<SavingsGoal>;
  debts?: MergedCollection<Debt>;
  /** Solo si el documento remoto ganó. */
  profile?: {
    userName: string;
    darkMode: DarkModeOption;
    onboardingDone: boolean;
    updatedAt: number;
  };
  settings?: { budgetAlertsEnabled: boolean; budgetAlertThreshold: number; updatedAt: number };
  /** Lo traído de los espacios compartidos (Fase 4), en orden, después de `lists`. */
  spaces?: SpaceListPatch[];
}

/**
 * Cambios de una lista compartida traídos de su espacio (spec Fase 4, D6/D8). Solo lo compartido:
 * período y presupuestos son de cada persona y no vienen del espacio.
 */
export type SpaceListPatch =
  /** Un espacio que el teléfono todavía no tiene como lista (restaurar, unirse en otro teléfono). */
  | { kind: "create"; list: WalletList }
  /** Lo compartido ganó (más nuevo que `space.sharedUpdatedAt`). */
  | {
      kind: "config";
      listId: string;
      name: string;
      emoji: string;
      categories: UserCategory[];
      showIncome: boolean;
      sharedUpdatedAt: number;
    }
  /** Las personas del espacio (la nube manda). */
  | { kind: "members"; listId: string; members: ListMember[] }
  /** Ya no es miembro (salió, lo quitaron, se eliminó): queda como lista propia. */
  | { kind: "unlink"; listId: string; now: number };

/** Aplica los cambios de espacios sobre las listas; la activa también en sus campos vivos. */
function applySpacePatches(
  lists: WalletList[],
  activeListId: string,
  patches: SpaceListPatch[],
): { lists: WalletList[]; activeCategories?: UserCategory[] } {
  let out = lists;
  let activeCategories: UserCategory[] | undefined;
  for (const p of patches) {
    if (p.kind === "create") {
      if (!out.some((l) => l.id === p.list.id)) out = [...out, p.list];
      continue;
    }
    out = out.map((l) => {
      if (l.id !== p.listId) return l;
      if (p.kind === "unlink") return l.space ? unlinkedList(l, p.now) : l;
      if (p.kind === "members") return { ...l, members: p.members };
      if (!l.space) return l;
      if (l.id === activeListId) activeCategories = p.categories;
      return {
        ...l,
        name: p.name,
        emoji: p.emoji,
        categories: p.categories,
        showIncome: p.showIncome,
        space: { ...l.space, sharedUpdatedAt: p.sharedUpdatedAt },
      };
    });
  }
  return { lists: out, activeCategories };
}

export interface RemoteSettingsState {
  lists: WalletList[];
  activeListId: string;
  defaultPeriod: PeriodCadence;
  userCategories: UserCategory[];
  budgetByCategory: Record<string, number>;
  paymentMethods: PaymentMethod[];
  savingsGoals: SavingsGoal[];
  debts: Debt[];
  tombstones: Tombstones;
  userName: string;
  darkMode: DarkModeOption;
  hasCompletedOnboarding: boolean;
  hasSelectedCategories: boolean;
  profileUpdatedAt: number;
  budgetAlertsEnabled: boolean;
  budgetAlertThreshold: number;
  settingsUpdatedAt: number;
}

/** Carga en los campos vivos los datos de una lista (como hace `swapActiveList`). */
function liveFieldsOf(list: WalletList, current: RemoteSettingsState) {
  return {
    defaultPeriod: list.period,
    userCategories: list.categories ?? current.userCategories,
    budgetByCategory: list.budgets ?? {},
  };
}

export function applySettingsPatch(
  state: RemoteSettingsState,
  patch: RemoteSettingsPatch,
): Partial<RemoteSettingsState> {
  const out: Partial<RemoteSettingsState> = {};
  const tombstones: Tombstones = { ...state.tombstones };

  if (patch.lists) {
    out.lists = patch.lists.items;
    tombstones.lists = patch.lists.tombstones;
    const active = patch.lists.items.find((l) => l.id === state.activeListId);
    if (!active) {
      // La activa se borró en otro teléfono: a Personal, que nunca se borra.
      const personal = patch.lists.items.find((l) => l.id === DEFAULT_LIST_ID);
      if (personal) {
        out.activeListId = DEFAULT_LIST_ID;
        Object.assign(out, liveFieldsOf(personal, state));
      }
    } else if (patch.lists.remoteWon.includes(state.activeListId)) {
      Object.assign(out, liveFieldsOf(active, state));
    }
  }
  if (patch.paymentMethods) {
    out.paymentMethods = patch.paymentMethods.items;
    tombstones.paymentMethods = patch.paymentMethods.tombstones;
  }
  if (patch.savingsGoals) {
    out.savingsGoals = patch.savingsGoals.items;
    tombstones.savingsGoals = patch.savingsGoals.tombstones;
  }
  if (patch.debts) {
    out.debts = patch.debts.items;
    tombstones.debts = patch.debts.tombstones;
  }
  if (patch.lists || patch.paymentMethods || patch.savingsGoals || patch.debts) {
    out.tombstones = tombstones;
  }

  if (patch.profile) {
    out.userName = patch.profile.userName;
    out.darkMode = patch.profile.darkMode;
    out.profileUpdatedAt = patch.profile.updatedAt;
    // El onboarding hecho no se deshace: si la nube dice que no, se respeta lo local.
    if (patch.profile.onboardingDone) {
      out.hasCompletedOnboarding = true;
      out.hasSelectedCategories = true;
    }
  }
  if (patch.settings) {
    out.budgetAlertsEnabled = patch.settings.budgetAlertsEnabled;
    out.budgetAlertThreshold = patch.settings.budgetAlertThreshold;
    out.settingsUpdatedAt = patch.settings.updatedAt;
  }

  if (patch.spaces && patch.spaces.length > 0) {
    const activeListId = out.activeListId ?? state.activeListId;
    const applied = applySpacePatches(out.lists ?? state.lists, activeListId, patch.spaces);
    out.lists = applied.lists;
    if (applied.activeCategories) out.userCategories = applied.activeCategories;
  }

  return out;
}
