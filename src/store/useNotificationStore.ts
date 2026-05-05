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

  /** Agrega una transacción detectada a la cola (evita duplicados por monto+banco en <2 min) */
  addPendingItem: (item: ParsedTransaction) => void;

  /** Elimina un item de la cola (al guardar o descartar) */
  removePendingItem: (id: string) => void;

  /** Limpia toda la cola */
  clearAll: () => void;
}

/** Detecta si ya hay un item similar (mismo banco + mismo monto en los últimos 2 minutos) */
function isDuplicate(existing: PendingNotificationItem[], incoming: ParsedTransaction): boolean {
  const TWO_MINUTES = 2 * 60 * 1000;
  const incomingTime = new Date(incoming.detectedAt).getTime();
  return existing.some((item) => {
    const itemTime = new Date(item.detectedAt).getTime();
    return (
      item.packageName === incoming.packageName &&
      item.amount === incoming.amount &&
      Math.abs(incomingTime - itemTime) < TWO_MINUTES
    );
  });
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      pendingItems: [],

      addPendingItem: (item) => {
        const current = get().pendingItems;
        if (isDuplicate(current, item)) return;
        const newItem: PendingNotificationItem = {
          ...item,
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        };
        set({ pendingItems: [newItem, ...current] });
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
    }
  )
);
