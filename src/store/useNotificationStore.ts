/**
 * useNotificationStore — cola de transacciones detectadas automáticamente
 * desde notificaciones bancarias.
 *
 * Se persiste en AsyncStorage para sobrevivir cold starts: cuando HeadlessJS
 * detecta una transacción en background y el usuario abre la app desde cero,
 * los items pendientes siguen disponibles en la pantalla de revisión.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ParsedTransaction } from "@/src/utils/notificationParser";

export interface PendingNotificationItem extends ParsedTransaction {
  /** ID único para manejo de la cola */
  id: string;
}

interface NotificationState {
  /** Cola de transacciones detectadas esperando confirmación del usuario */
  pendingItems: PendingNotificationItem[];

  /**
   * Agrega una transacción detectada a la cola (evita duplicados por monto+banco en <2 min).
   * Devuelve `{ id, isNew }` — ver AGENTS.md → "Gotchas críticos" → "Deep link desde
   * notificación push" (por qué `isNew` importa para la push).
   */
  addPendingItem: (item: ParsedTransaction) => { id: string; isNew: boolean };

  /** Elimina un item de la cola (al guardar o descartar) */
  removePendingItem: (id: string) => void;

  /** Limpia toda la cola */
  clearAll: () => void;
}

/**
 * Detecta si ya hay un item similar (mismo banco + mismo monto en los últimos 2 minutos).
 * Devuelve el id del duplicado encontrado, o null si no hay ninguno.
 */
function findDuplicate(existing: PendingNotificationItem[], incoming: ParsedTransaction): string | null {
  const TWO_MINUTES = 2 * 60 * 1000;
  const incomingTime = new Date(incoming.detectedAt).getTime();
  const match = existing.find((item) => {
    const itemTime = new Date(item.detectedAt).getTime();
    return (
      item.packageName === incoming.packageName &&
      item.amount === incoming.amount &&
      Math.abs(incomingTime - itemTime) < TWO_MINUTES
    );
  });
  return match?.id ?? null;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      pendingItems: [],

      addPendingItem: (item) => {
        const current = get().pendingItems;
        const duplicateId = findDuplicate(current, item);
        if (duplicateId) return { id: duplicateId, isNew: false };
        const newItem: PendingNotificationItem = {
          ...item,
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        };
        set({ pendingItems: [newItem, ...current] });
        return { id: newItem.id, isNew: true };
      },

      removePendingItem: (id) =>
        set((s) => ({ pendingItems: s.pendingItems.filter((i) => i.id !== id) })),

      clearAll: () => set({ pendingItems: [] }),
    }),
    {
      name: "notification-pending-queue",
      storage: createJSONStorage(() => AsyncStorage),
      // Solo persiste los items pendientes; no hace falta versionar el estado de UI
      partialize: (state) => ({ pendingItems: state.pendingItems }),
    },
  ),
);

/**
 * Busca un item pendiente por id, esperando primero la rehidratación de `persist` si
 * todavía no terminó. Ver AGENTS.md → "Gotchas críticos" → "Deep link desde notificación
 * push". Timeout de seguridad por si la rehidratación queda colgada.
 */
export async function getPendingItemAfterHydration(
  id: string,
): Promise<PendingNotificationItem | null> {
  await waitForNotificationStoreHydration();
  return useNotificationStore.getState().pendingItems.find((i) => i.id === id) ?? null;
}

/**
 * Espera a que `persist` termine de rehidratar la cola desde AsyncStorage. Ver AGENTS.md →
 * "Gotchas críticos" → "Deep link desde notificación push" (por qué hay que esperarla antes
 * de `addPendingItem` en HeadlessJS).
 */
export async function waitForNotificationStoreHydration(): Promise<void> {
  if (useNotificationStore.persist.hasHydrated()) return;
  await new Promise<void>((resolve) => {
    const unsub = useNotificationStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
    setTimeout(resolve, 1500);
  });
}
