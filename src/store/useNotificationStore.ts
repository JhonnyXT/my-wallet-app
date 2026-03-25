/**
 * useNotificationStore — cola de transacciones detectadas automáticamente
 * desde notificaciones bancarias. No se persiste en AsyncStorage:
 * las notificaciones pendientes solo viven en memoria mientras la app está abierta.
 */
import { create } from "zustand";
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

export const useNotificationStore = create<NotificationState>((set, get) => ({
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
}));
