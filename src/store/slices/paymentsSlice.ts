import type { StateCreator } from "zustand";
import { newId } from "@/src/utils/ids";
import { addTombstone, type TombstonesSlice } from "./tombstonesSlice";

export type PaymentMethodType = "cash" | "debit" | "savings";

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  /** Ícono elegido por el usuario; sin él se usa el del tipo. */
  emoji?: string;
  /** Última edición, epoch ms (sync). */
  updatedAt: number;
}

export const PAYMENT_TYPE_EMOJI: Record<PaymentMethodType, string> = {
  cash: "💵",
  debit: "💳",
  savings: "🐷",
};

export function paymentMethodEmoji(m: Pick<PaymentMethod, "type" | "emoji">): string {
  return m.emoji ?? PAYMENT_TYPE_EMOJI[m.type] ?? "💳";
}

// Ids fijos e iguales en todos los teléfonos (las transacciones los referencian); `updatedAt: 0`
// para que cualquier edición real gane al unir datos de dos teléfonos.
const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { id: "cash", name: "Efectivo", type: "cash", updatedAt: 0 },
  { id: "savings", name: "Ahorros", type: "savings", updatedAt: 0 },
  { id: "credit", name: "Tarjeta", type: "debit", updatedAt: 0 },
];

export interface PaymentsSlice {
  paymentMethods: PaymentMethod[];

  addPaymentMethod: (method: Omit<PaymentMethod, "id" | "updatedAt">) => void;
  updatePaymentMethod: (id: string, name: string, type: PaymentMethodType, emoji?: string) => void;
  removePaymentMethod: (id: string) => void;
}

export const createPaymentsSlice: StateCreator<
  PaymentsSlice & TombstonesSlice,
  [],
  [],
  PaymentsSlice
> = (set) => ({
  paymentMethods: DEFAULT_PAYMENT_METHODS,

  addPaymentMethod: (method) =>
    set((s) => ({
      paymentMethods: [...s.paymentMethods, { ...method, id: newId(), updatedAt: Date.now() }],
    })),
  updatePaymentMethod: (id, name, type, emoji) =>
    set((s) => ({
      paymentMethods: s.paymentMethods.map((m) =>
        m.id === id ? { ...m, name, type, emoji, updatedAt: Date.now() } : m,
      ),
    })),
  removePaymentMethod: (id) =>
    set((s) => ({
      paymentMethods: s.paymentMethods.filter((m) => m.id !== id),
      tombstones: addTombstone(s.tombstones, "paymentMethods", id, Date.now()),
    })),
});
