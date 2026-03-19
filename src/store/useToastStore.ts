/**
 * useToastStore — cola global de in-app toasts efímeros.
 * No se persiste en AsyncStorage (los toasts son de sesión).
 */
import { create } from "zustand";

export type ToastLevel = "success" | "warning" | "danger" | "info";

export interface Toast {
  id: string;
  level: ToastLevel;
  title: string;
  icon?: string;        // emoji del icono izquierdo; si no se pasa, se usa el default del level
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;    // ms — solo si está definido se activa auto-dismiss
}

interface ToastState {
  toasts: Toast[];
  addToast: (t: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const MAX_TOASTS = 3;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],

  addToast: (t) =>
    set((s) => {
      const newToast: Toast = { ...t, id: Date.now().toString() };
      const updated = [newToast, ...s.toasts];
      return { toasts: updated.slice(0, MAX_TOASTS) };
    }),

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
