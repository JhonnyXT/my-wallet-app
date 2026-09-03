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
   * Devuelve el id generado (o el del duplicado existente si no se agregó nada) — lo usa
   * `notificationHeadlessTask.ts` para que la notificación push lleve el id del item exacto
   * que la originó (deep link directo a `active-expense` cuando es el único pendiente).
   */
  addPendingItem: (item: ParsedTransaction) => string;

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
        if (duplicateId) return duplicateId;
        const newItem: PendingNotificationItem = {
          ...item,
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        };
        set({ pendingItems: [newItem, ...current] });
        return newItem.id;
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
 * Busca un item pendiente por id, esperando primero a que `persist` termine de
 * rehidratar desde AsyncStorage si todavía no lo hizo. Necesario en `app/_layout.tsx`
 * al resolver el deep link de una notificación bancaria en un cold start (app matada,
 * el usuario toca la notificación): ese código puede correr antes de que la
 * rehidratación async del store termine, y sin esperarla el item "no existiría"
 * aunque sí esté en AsyncStorage. Timeout de seguridad por si la rehidratación ya
 * terminó pero el flag no se actualizó a tiempo, o queda colgada por algún motivo.
 */
export async function getPendingItemAfterHydration(
  id: string,
): Promise<PendingNotificationItem | null> {
  if (!useNotificationStore.persist.hasHydrated()) {
    await new Promise<void>((resolve) => {
      const unsub = useNotificationStore.persist.onFinishHydration(() => {
        unsub();
        resolve();
      });
      setTimeout(resolve, 1500);
    });
  }
  return useNotificationStore.getState().pendingItems.find((i) => i.id === id) ?? null;
}
