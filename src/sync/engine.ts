/**
 * Motor de respaldo (SYNC_ROADMAP.md, Fase 3; spec D3). SQLite y el store siguen siendo la fuente
 * de verdad: aquí solo se copia a/desde `users/{uid}` en segundo plano. Ninguna pantalla espera.
 *
 * Una corrida a la vez: traer → unir → subir. Traer primero evita que la primera subida (T8)
 * pise con datos locales viejos algo más nuevo de la nube.
 *
 * Disparadores: sesión iniciada (al abrir la app o al entrar), volver a primer plano, deslizar en
 * el Dashboard (`syncNow`), y cambios locales (solo subir, con espera de 3 s para agrupar).
 */
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth, onAuthStateChanged } from "@react-native-firebase/auth";
import { ALLOWED_BANKS_KEY, AUTO_DETECT_ENABLED_KEY } from "@/src/constants/banks";
import {
  applyRemoteTransactions,
  countPendingTransactions,
  getPendingTransactions,
  getTransactionVersions,
  markAllTransactionsPending,
  markListTransactionsPending,
  markTransactionsSynced,
  wipeAllTransactions,
} from "@/src/db/db";
import { cancelDebtReminder, scheduleDebtReminder } from "@/src/services/notificationService";
import { withLiveActiveList, type WalletList } from "@/src/store/slices/listsSlice";
import type { TombstoneKind } from "@/src/store/slices/tombstonesSlice";
import type { RemoteSettingsPatch } from "@/src/store/remoteSettings";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { useNotificationStore } from "@/src/store/useNotificationStore";
import {
  applyRemoteSettings,
  resetSettingsStore,
  useSettingsStore,
  type SettingsState,
} from "@/src/store/useSettingsStore";
import { onLocalChange } from "@/src/utils/localChanges";
import { ensureFirebase } from "./firebase";
import { isOffline, withTimeout } from "./net";
import {
  docToTransaction,
  itemToDoc,
  tombstoneDoc,
  transactionToDoc,
  type RemoteDoc,
  type TransactionDoc,
} from "./mappers";
import { keepLocalShared, mergeCollection, remoteDocWins, transactionsToApply } from "./merge";
import {
  advanceCursor,
  belongsToOtherAccount,
  forgetSpace,
  markPushed,
  needsPush,
  pendingItems,
  trackBanks,
  type SyncMeta,
} from "./meta";
import { clearMeta, loadMeta, saveMeta } from "./metaStore";
import {
  BATCH_SIZE,
  deleteAllUserData,
  pullCollection,
  pullDoc,
  pushBatch,
  type PushOp,
} from "./remote";
import { classifySpaceError } from "./errors";
import { deleteAccount, signOut } from "./session";
import { deleteSpaceData, removeFromSpace } from "./spacesRemote";
import { pendingSpaceConfigs, pullSpaces, pushSpaceConfigs, pushSpaceRows } from "./spaces";
import { useSyncStatus } from "./status";

const SETTINGS_KINDS: TombstoneKind[] = ["lists", "paymentMethods", "savingsGoals", "debts"];
const LOCAL_CHANGE_DEBOUNCE_MS = 3000;
const OFFLINE_RETRY_MS = 60000;
/** Volver a primer plano no trae más de una vez por este intervalo (lecturas = cuota). */
const FOREGROUND_MIN_INTERVAL_MS = 30000;

interface ProfileDoc {
  userName: string;
  darkMode: SettingsState["darkMode"];
  onboardingDone: boolean;
}
interface SettingsDoc {
  budgetAlertsEnabled: boolean;
  budgetAlertThreshold: number;
  allowedBanks: string[];
}

function parseBanks(raw: string | null): string[] {
  try {
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.filter((b) => typeof b === "string") : [];
  } catch {
    return [];
  }
}

// ─── Traer y unir ────────────────────────────────────────────────────────────

async function pull(uid: string, meta: SyncMeta): Promise<SyncMeta> {
  // 1. Leer todo (async). Unir y aplicar después en un solo bloque síncrono, con el estado fresco:
  //    así una edición del usuario en medio de la lectura no se pisa.
  const remoteItems: Partial<Record<TombstoneKind, RemoteDoc<never>[]>> = {};
  for (const kind of SETTINGS_KINDS) {
    remoteItems[kind] = await withTimeout(
      pullCollection<never>(uid, kind, meta.cursors[kind] ?? 0),
    );
  }
  const profile = await withTimeout(pullDoc<ProfileDoc>(uid, "profile"));
  const settings = await withTimeout(pullDoc<SettingsDoc>(uid, "settings"));
  const txDocs = await withTimeout(
    pullCollection<TransactionDoc>(uid, "transactions", meta.cursors.transactions ?? 0),
  );

  // 2. Ajustes: unir con el estado actual y aplicar (síncrono).
  const state = useSettingsStore.getState();
  const patch: RemoteSettingsPatch = {};
  let changedDebtIds: string[] = [];
  for (const kind of SETTINGS_KINDS) {
    const docs = remoteItems[kind] ?? [];
    if (docs.length === 0) continue;
    const local = kind === "lists" ? withLiveActiveList(state) : state[kind];
    const merged = mergeCollection(
      local as { id: string; updatedAt: number }[],
      state.tombstones[kind],
      docs,
    );
    if (kind === "lists") {
      // Lo compartido de una lista compartida es del espacio, no del respaldo personal (D2).
      merged.items = keepLocalShared(local as WalletList[], merged.items as WalletList[]);
    }
    meta = markPushed(meta, kind, merged.accepted);
    meta = advanceCursor(meta, kind, Math.max(...docs.map((d) => d.serverUpdatedAt)));
    if (merged.remoteWon.length > 0) {
      (patch as Record<string, unknown>)[kind] = merged;
      if (kind === "debts") changedDebtIds = merged.remoteWon;
    }
  }
  if (profile && remoteDocWins(state.profileUpdatedAt, profile)) {
    patch.profile = {
      userName: profile.userName ?? "",
      darkMode: profile.darkMode ?? "system",
      onboardingDone: profile.onboardingDone === true,
      updatedAt: profile.updatedAt,
    };
    meta = { ...meta, pushedDocs: { ...meta.pushedDocs, profile: profile.updatedAt } };
  }
  const localSettingsVersion = Math.max(state.settingsUpdatedAt, meta.banks?.updatedAt ?? 0);
  if (settings && remoteDocWins(localSettingsVersion, settings)) {
    patch.settings = {
      budgetAlertsEnabled: settings.budgetAlertsEnabled === true,
      budgetAlertThreshold: settings.budgetAlertThreshold ?? 80,
      updatedAt: settings.updatedAt,
    };
    const banks = Array.isArray(settings.allowedBanks) ? settings.allowedBanks : [];
    meta = {
      ...meta,
      banks: { value: banks, updatedAt: settings.updatedAt },
      pushedDocs: { ...meta.pushedDocs, settings: settings.updatedAt },
    };
  }
  if (Object.keys(patch).length > 0) {
    applying = true;
    try {
      applyRemoteSettings(patch);
    } finally {
      applying = false;
    }
  }
  if (patch.settings) {
    await AsyncStorage.setItem(ALLOWED_BANKS_KEY, JSON.stringify(meta.banks?.value ?? []));
  }

  // 3. Recordatorios de las deudas que cambiaron (RF-08).
  const debts = useSettingsStore.getState().debts;
  for (const id of changedDebtIds) {
    const debt = debts.find((d) => d.id === id);
    if (debt && debt.remainingAmount > 0) await scheduleDebtReminder(debt).catch(() => undefined);
    else await cancelDebtReminder(id).catch(() => undefined);
  }

  // 4. Transacciones.
  let txApplied = 0;
  if (txDocs.length > 0) {
    const rows = txDocs.map((d) => docToTransaction(d.id, d.data));
    const versions = await getTransactionVersions(rows.map((r) => r.uid));
    const toApply = transactionsToApply(versions, rows);
    await applyRemoteTransactions(toApply);
    txApplied = toApply.length;
    meta = advanceCursor(meta, "transactions", Math.max(...txDocs.map((d) => d.serverUpdatedAt)));
  }

  // 5. Espacios compartidos (Fase 4), con las listas ya unidas con el respaldo personal.
  const spaces = await pullSpaces(
    uid,
    meta,
    withLiveActiveList(useSettingsStore.getState()),
    Date.now(),
  );
  meta = spaces.meta;
  if (spaces.patches.length > 0) applyQuietly({ spaces: spaces.patches });
  // Desconectadas: sus movimientos pasan al respaldo personal (D8).
  for (const listId of spaces.unlinked) await markListTransactionsPending(listId);
  if (spaces.transactions.length > 0) {
    const versions = await getTransactionVersions(spaces.transactions.map((r) => r.uid));
    const toApply = transactionsToApply(versions, spaces.transactions);
    await applyRemoteTransactions(toApply);
    txApplied += toApply.length;
  }

  if (txApplied > 0 || patch.lists || spaces.patches.length > 0) {
    await useFinanceStore.getState().loadTransactions();
  }
  return meta;
}

/** Aplica lo traído sin que el `subscribe` de ajustes lo tome como un cambio local para subir. */
function applyQuietly(patch: RemoteSettingsPatch): void {
  applying = true;
  try {
    applyRemoteSettings(patch);
  } finally {
    applying = false;
  }
}

/** Perdí el acceso a estos espacios: las listas quedan como propias (D8). */
async function unlinkLost(listIds: string[], meta: SyncMeta): Promise<SyncMeta> {
  if (listIds.length === 0) return meta;
  const lists = useSettingsStore.getState().lists;
  for (const id of listIds) {
    const spaceId = lists.find((l) => l.id === id)?.space?.spaceId;
    if (spaceId) meta = forgetSpace(meta, spaceId);
  }
  // Sin applyQuietly: la lista cambió (sin enlace) y hay que respaldarla así.
  applyRemoteSettings({
    spaces: listIds.map((listId) => ({ kind: "unlink" as const, listId, now: Date.now() })),
  });
  for (const id of listIds) await markListTransactionsPending(id);
  await useFinanceStore.getState().loadTransactions();
  return meta;
}

// ─── Subir ───────────────────────────────────────────────────────────────────

async function push(uid: string, meta: SyncMeta): Promise<SyncMeta> {
  const state = useSettingsStore.getState();
  const ops: PushOp[] = [];
  const versions: Partial<Record<TombstoneKind, Record<string, number>>> = {};

  for (const kind of SETTINGS_KINDS) {
    const items = (kind === "lists" ? withLiveActiveList(state) : state[kind]) as {
      id: string;
      updatedAt: number;
    }[];
    const { upserts, deletes } = pendingItems(items, state.tombstones[kind], meta.pushed[kind]);
    const v: Record<string, number> = {};
    for (const item of upserts) {
      ops.push({ kind, id: item.id, data: itemToDoc(item) });
      v[item.id] = item.updatedAt;
    }
    for (const del of deletes) {
      ops.push({ kind, id: del.id, data: tombstoneDoc(del.deletedAt) });
      v[del.id] = del.deletedAt;
    }
    versions[kind] = v;
  }

  const profileVersion = state.profileUpdatedAt;
  const pushProfile = needsPush(meta.pushedDocs.profile, profileVersion);
  if (pushProfile) {
    ops.push({
      kind: "profile",
      id: "profile",
      data: {
        userName: state.userName,
        darkMode: state.darkMode,
        onboardingDone: state.hasCompletedOnboarding,
        updatedAt: profileVersion,
      },
    });
  }
  const settingsVersion = Math.max(state.settingsUpdatedAt, meta.banks?.updatedAt ?? 0);
  const pushSettings = needsPush(meta.pushedDocs.settings, settingsVersion);
  if (pushSettings) {
    ops.push({
      kind: "settings",
      id: "settings",
      data: {
        budgetAlertsEnabled: state.budgetAlertsEnabled,
        budgetAlertThreshold: state.budgetAlertThreshold,
        allowedBanks: meta.banks?.value ?? [],
        updatedAt: settingsVersion,
      },
    });
  }

  if (ops.length > 0) {
    await withTimeout(pushBatch(uid, ops));
    for (const kind of SETTINGS_KINDS) meta = markPushed(meta, kind, versions[kind] ?? {});
    meta = {
      ...meta,
      pushedDocs: {
        ...meta.pushedDocs,
        ...(pushProfile ? { profile: profileVersion } : {}),
        ...(pushSettings ? { settings: settingsVersion } : {}),
      },
    };
    await saveMeta(meta);
  }

  // Lo compartido de las listas compartidas (Fase 4).
  const configs = await pushSpaceConfigs(meta, withLiveActiveList(useSettingsStore.getState()));
  meta = await unlinkLost(configs.lost, configs.meta);
  await saveMeta(meta);

  // Transacciones por lotes, cada una a su lugar: el espacio de su lista, o el respaldo personal.
  // Una editada durante la subida sigue pendiente y sale en la próxima.
  for (let round = 0; round < 50; round++) {
    const rows = await getPendingTransactions(BATCH_SIZE);
    if (rows.length === 0) break;
    const lists = new Map(useSettingsStore.getState().lists.map((l) => [l.id, l]));
    const personal: typeof rows = [];
    const bySpaceList = new Map<string, typeof rows>();
    for (const r of rows) {
      const list = lists.get(r.list_id);
      if (list?.space) bySpaceList.set(list.id, [...(bySpaceList.get(list.id) ?? []), r]);
      else personal.push(r);
    }
    if (personal.length > 0) {
      await withTimeout(
        pushBatch(
          uid,
          personal.map((r) => ({
            kind: "transactions" as const,
            id: r.uid,
            data: transactionToDoc(r),
          })),
        ),
      );
      await markTransactionsSynced(personal.map((r) => ({ uid: r.uid, updated_at: r.updated_at })));
    }
    const lost: string[] = [];
    for (const [listId, listRows] of bySpaceList) {
      if (await pushSpaceRows(lists.get(listId)!, listRows)) {
        await markTransactionsSynced(
          listRows.map((r) => ({ uid: r.uid, updated_at: r.updated_at })),
        );
      } else {
        lost.push(listId);
      }
    }
    // Perdí el acceso a un espacio: sus movimientos vuelven a salir, ahora al respaldo personal.
    meta = await unlinkLost(lost, meta);
    if (rows.length < BATCH_SIZE && lost.length === 0) break;
  }
  return meta;
}

// ─── Pendientes (para Ajustes → Cuenta) ──────────────────────────────────────

async function countPending(meta: SyncMeta): Promise<number> {
  const state = useSettingsStore.getState();
  let n = await countPendingTransactions();
  n += pendingSpaceConfigs(meta, withLiveActiveList(state)).length;
  for (const kind of SETTINGS_KINDS) {
    const items = (kind === "lists" ? withLiveActiveList(state) : state[kind]) as {
      id: string;
      updatedAt: number;
    }[];
    const { upserts, deletes } = pendingItems(items, state.tombstones[kind], meta.pushed[kind]);
    n += upserts.length + deletes.length;
  }
  return n;
}

// ─── Orquestación ────────────────────────────────────────────────────────────

let applying = false;
/** Mientras se elimina la cuenta no corre nada (una subida en paralelo reharía lo borrado). */
let suspended = false;
let running: Promise<void> | null = null;
let again: { pull: boolean } | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function currentUid(): string | null {
  ensureFirebase();
  return getAuth().currentUser?.uid ?? null;
}

async function syncOnce(uid: string, opts: { pull: boolean }): Promise<void> {
  const status = useSyncStatus.getState();
  let meta = await loadMeta();
  if (belongsToOtherAccount(meta, uid)) {
    status.set({ phase: "needs-decision" });
    return;
  }
  status.set({ phase: "syncing" });
  try {
    meta = trackBanks(meta, parseBanks(await AsyncStorage.getItem(ALLOWED_BANKS_KEY)), Date.now());
    if (opts.pull) meta = await pull(uid, meta);
    meta = await push(uid, meta);
    meta = { ...meta, ownerUid: uid, lastSyncAt: Date.now() };
    await saveMeta(meta);
    status.set({ phase: "idle", lastSyncAt: meta.lastSyncAt, pending: await countPending(meta) });
  } catch (e) {
    await saveMeta(meta).catch(() => undefined);
    const offline = isOffline(e);
    if (!offline) console.warn("[sync] Error:", e);
    status.set({ phase: offline ? "offline" : "error", pending: await countPending(meta) });
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => requestSync({ pull: true }), OFFLINE_RETRY_MS);
  }
}

/** Pide una corrida; si ya hay una, se repite al terminar (con traída si alguna la pidió). */
export function requestSync(opts: { pull: boolean }): Promise<void> {
  const uid = currentUid();
  if (!uid || suspended) return Promise.resolve();
  if (running) {
    again = { pull: (again?.pull ?? false) || opts.pull };
    return running;
  }
  running = (async () => {
    try {
      let next: { pull: boolean } | null = opts;
      while (next) {
        again = null;
        const who = currentUid();
        if (!who) break;
        await syncOnce(who, next);
        next = again;
      }
    } finally {
      running = null;
    }
  })();
  return running;
}

/**
 * Corre `fn` sin ninguna corrida de sync a la vez (acciones de espacios: compartir, unirse,
 * salir…), para que una traída a medias no pise lo que la acción acaba de escribir.
 */
export async function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  while (running) await running.catch(() => undefined);
  let release!: () => void;
  running = new Promise<void>((resolve) => (release = resolve));
  try {
    return await fn();
  } finally {
    running = null;
    release();
    // Lo que se pidió mientras corría la acción, ahora.
    const pending = again;
    again = null;
    if (pending) void requestSync(pending);
  }
}

/** Traer y subir ya (iniciar sesión, deslizar en el Dashboard, restaurar). */
export function syncNow(): Promise<void> {
  return requestSync({ pull: true });
}

let started = false;

/** Una vez, al arrancar la app (tras el bootstrap). Sin sesión no hace nada hasta que la haya. */
export function startSync(): void {
  if (started) return;
  started = true;
  ensureFirebase();

  onAuthStateChanged(getAuth(), (user) => {
    if (user) {
      void syncNow();
    } else {
      if (retryTimer) clearTimeout(retryTimer);
      useSyncStatus.getState().set({ phase: "idle", pending: 0, lastSyncAt: null });
    }
  });

  let lastForeground = 0;
  AppState.addEventListener("change", (next) => {
    if (next !== "active" || Date.now() - lastForeground < FOREGROUND_MIN_INTERVAL_MS) return;
    lastForeground = Date.now();
    void syncNow();
  });

  let debounce: ReturnType<typeof setTimeout> | null = null;
  const schedulePush = () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => void requestSync({ pull: false }), LOCAL_CHANGE_DEBOUNCE_MS);
  };
  onLocalChange(schedulePush);
  // Ajustes: solo lo que se respalda, y nunca lo que acaba de aplicar la propia sync.
  useSettingsStore.subscribe((s, prev) => {
    if (applying) return;
    if (
      s.lists !== prev.lists ||
      s.paymentMethods !== prev.paymentMethods ||
      s.savingsGoals !== prev.savingsGoals ||
      s.debts !== prev.debts ||
      s.tombstones !== prev.tombstones ||
      s.defaultPeriod !== prev.defaultPeriod ||
      s.userCategories !== prev.userCategories ||
      s.budgetByCategory !== prev.budgetByCategory ||
      s.profileUpdatedAt !== prev.profileUpdatedAt ||
      s.settingsUpdatedAt !== prev.settingsUpdatedAt
    ) {
      schedulePush();
    }
  });
}

// ─── Cuenta: datos de otra cuenta, cerrar sesión, borrar del teléfono ────────

/** Cambios locales sin respaldar (para bloquear "Borrar de este teléfono", RF-12). */
export async function pendingChanges(): Promise<number> {
  return countPending(await loadMeta());
}

/**
 * Deja el teléfono como recién instalado (RF-11). Quien llama comprueba antes que no haya
 * pendientes y luego navega al onboarding.
 */
export async function wipeLocalData(): Promise<void> {
  for (const debt of useSettingsStore.getState().debts) {
    await cancelDebtReminder(debt.id).catch(() => undefined);
  }
  await wipeAllTransactions();
  applying = true;
  try {
    resetSettingsStore();
  } finally {
    applying = false;
  }
  useNotificationStore.getState().clearAll();
  await AsyncStorage.multiRemove([ALLOWED_BANKS_KEY, AUTO_DETECT_ENABLED_KEY]);
  await clearMeta();
  await useFinanceStore.getState().loadTransactions();
  useSyncStatus.getState().set({ phase: "idle", pending: 0, lastSyncAt: null });
}

/**
 * Los datos del teléfono son de otra cuenta (RF-13): "merge" los une con la actual; "replace"
 * los borra del teléfono (solo sin pendientes) y trae los de la actual.
 */
export async function resolveAccountConflict(choice: "merge" | "replace"): Promise<void> {
  const uid = currentUid();
  if (!uid) return;
  if (choice === "replace") {
    await wipeLocalData();
  } else {
    await saveMeta({ ...(await loadMeta()), ownerUid: uid });
  }
  await syncNow();
}

/**
 * Eliminar cuenta (RF-14): pausa la sync, borra todo lo de la nube, luego la cuenta. Los datos del
 * teléfono se quedan y vuelven a "pendiente" (si más adelante inicia sesión, se suben enteros).
 */
export async function deleteAccountAndCloudData(): Promise<void> {
  suspended = true;
  try {
    if (running) await running.catch(() => undefined);
    await deleteAccount(async (uid) => {
      // Primero los espacios (mientras la sesión sigue siendo válida): elimina los míos y sale de
      // los demás; después lo personal (riesgo 8 del spec Fase 4).
      for (const list of useSettingsStore.getState().lists) {
        const link = list.space;
        if (!link) continue;
        await withTimeout(
          link.ownerUid === uid
            ? deleteSpaceData(link.spaceId, uid, Date.now())
            : removeFromSpace(link.spaceId, link.selfMemberId, uid, Date.now()),
        ).catch((e) => {
          // Ya no era miembro: nada que hacer en ese espacio.
          if (classifySpaceError(e) !== "not-allowed") throw e;
        });
      }
      await withTimeout(deleteAllUserData(uid));
    });
    // Las listas compartidas quedan como propias en el teléfono (D8).
    const shared = useSettingsStore
      .getState()
      .lists.filter((l) => l.space)
      .map((l) => l.id);
    if (shared.length > 0) {
      applyQuietly({
        spaces: shared.map((listId) => ({ kind: "unlink" as const, listId, now: Date.now() })),
      });
    }
    await clearMeta();
    await markAllTransactionsPending();
    useSyncStatus.getState().set({ phase: "idle", pending: 0, lastSyncAt: null });
  } finally {
    suspended = false;
  }
}

/**
 * Cerrar sesión (T9). "keep" no toca nada local. "wipe" deja el teléfono como recién instalado,
 * solo si no hay cambios sin respaldar (RF-12): si los hay, no cierra sesión y devuelve cuántos.
 */
export async function signOutWith(mode: "keep" | "wipe"): Promise<{ blockedPending: number }> {
  if (mode === "wipe") {
    await syncNow().catch(() => undefined);
    const pending = await pendingChanges();
    if (pending > 0) return { blockedPending: pending };
  }
  await signOut();
  if (mode === "wipe") await wipeLocalData();
  return { blockedPending: 0 };
}
