import type { StateCreator } from "zustand";

export type PaymentMethodType = "cash" | "debit" | "savings";

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  /** Ícono elegido por el usuario; sin él se usa el del tipo. */
  emoji?: string;
}

export const PAYMENT_TYPE_EMOJI: Record<PaymentMethodType, string> = {
  cash: "💵",
  debit: "💳",
  savings: "🐷",
};

export function paymentMethodEmoji(m: Pick<PaymentMethod, "type" | "emoji">): string {
  return m.emoji ?? PAYMENT_TYPE_EMOJI[m.type] ?? "💳";
}

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { id: "cash", name: "Efectivo", type: "cash" },
  { id: "savings", name: "Ahorros", type: "savings" },
  { id: "credit", name: "Tarjeta", type: "debit" },
];

export interface PaymentsSlice {
  paymentMethods: PaymentMethod[];

  setPaymentMethods: (methods: PaymentMethod[]) => void;
  addPaymentMethod: (method: PaymentMethod) => void;
  updatePaymentMethod: (id: string, name: string, type: PaymentMethodType, emoji?: string) => void;
  removePaymentMethod: (id: string) => void;
}

export const createPaymentsSlice: StateCreator<PaymentsSlice, [], [], PaymentsSlice> = (set) => ({
  paymentMethods: DEFAULT_PAYMENT_METHODS,

  setPaymentMethods: (methods) => set({ paymentMethods: methods }),
  addPaymentMethod: (method) => set((s) => ({ paymentMethods: [...s.paymentMethods, method] })),
  updatePaymentMethod: (id, name, type, emoji) =>
    set((s) => ({
      paymentMethods: s.paymentMethods.map((m) => (m.id === id ? { ...m, name, type, emoji } : m)),
    })),
  removePaymentMethod: (id) =>
    set((s) => ({ paymentMethods: s.paymentMethods.filter((m) => m.id !== id) })),
});
