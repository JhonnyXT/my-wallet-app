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
   * Devuelve el id del item (el nuevo, o el del duplicado existente) y si realmente se agregó:
   * `notificationHeadlessTask.ts` solo manda la push cuando `isNew` — Android puede entregar
   * la misma notificación bancaria dos veces (post + update) y cada entrega disparaba su push.
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
  await waitForNotificationStoreHydration();
  return useNotificationStore.getState().pendingItems.find((i) => i.id === id) ?? null;
}

/**
 * Espera a que `persist` termine de rehidratar la cola desde AsyncStorage. En HeadlessJS
 * (cold start) hay que llamarla antes de `addPendingItem`: si se agrega antes de hidratar,
 * la rehidratación pisa el estado y se pierde el item, y el chequeo de duplicados no ve la
 * cola real.
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
