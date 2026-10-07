/**
 * useRecurringQueueStore — cola de recurrentes vencidos sin confirmar, derivada en memoria.
 *
 * A diferencia de `useNotificationStore` (persistido porque un HeadlessJS en background la llena
 * sin que la app esté abierta), acá no hay ningún proceso de background escribiendo la cola: se
 * recalcula barato desde `useSettingsStore.recurringExpenses` + la fecha actual cada vez que algo
 * pudo haber cambiado. No se recalcula sola (sin `subscribe`, para no esconder cuándo corre):
 * quien cambia algo relevante llama `recompute()` explícitamente —
 * - `app/_layout.tsx`, en el bootstrap (tras esperar la rehidratación de `useSettingsStore`);
 * - `app/settings.tsx`, tras crear/editar/pausar/reanudar/eliminar un recurrente;
 * - `app/active-expense.tsx`/`app/recurring-review.tsx`, tras confirmar u omitir una ocurrencia.
 */
import { create } from "zustand";
import { useSettingsStore } from "./useSettingsStore";
import { dueRecurring, type RecurringOccurrence } from "@/src/utils/recurring";

interface RecurringQueueState {
  queue: RecurringOccurrence[];
  /** Recalcula la cola contra el estado actual de `useSettingsStore` y la fecha dada (hoy por defecto).
   *  Los ciclos más viejos que el tope (`autoSkip` de `dueRecurring`) se marcan manejados de una vez. */
  recompute: (now?: Date) => void;
}

export const useRecurringQueueStore = create<RecurringQueueState>((set) => ({
  queue: [],

  recompute: (now = new Date()) => {
    const { recurringExpenses, markHandled } = useSettingsStore.getState();
    const { queue, autoSkip } = dueRecurring(recurringExpenses, now);
    for (const [id, cycleKey] of Object.entries(autoSkip)) {
      markHandled(id, cycleKey);
    }
    set({ queue });
  },
}));
