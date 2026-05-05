import type { StateCreator } from "zustand";

export type PaymentMethodType = "cash" | "debit" | "savings";

export interface PaymentMethod {
  id:   string;
  name: string;
  type: PaymentMethodType;
}

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { id: "cash",    name: "Efectivo", type: "cash"    },
  { id: "savings", name: "Ahorros",  type: "savings" },
  { id: "credit",  name: "Tarjeta",  type: "debit"   },
];

export interface PaymentsSlice {
  paymentMethods: PaymentMethod[];

  setPaymentMethods:   (methods: PaymentMethod[]) => void;
  addPaymentMethod:    (method: PaymentMethod) => void;
  updatePaymentMethod: (id: string, name: string, type: PaymentMethodType) => void;
  removePaymentMethod: (id: string) => void;
}

export const createPaymentsSlice: StateCreator<PaymentsSlice, [], [], PaymentsSlice> = (set) => ({
  paymentMethods: DEFAULT_PAYMENT_METHODS,

  setPaymentMethods: (methods) => set({ paymentMethods: methods }),
  addPaymentMethod:  (method)  => set((s) => ({ paymentMethods: [...s.paymentMethods, method] })),
  updatePaymentMethod: (id, name, type) =>
    set((s) => ({
      paymentMethods: s.paymentMethods.map((m) => m.id === id ? { ...m, name, type } : m),
    })),
  removePaymentMethod: (id) =>
    set((s) => ({ paymentMethods: s.paymentMethods.filter((m) => m.id !== id) })),
});
