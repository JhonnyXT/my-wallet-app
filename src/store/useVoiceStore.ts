import { create } from "zustand";
import type { MultiVoiceResult } from "@/src/utils/voiceParser";

export type VoiceStatus = "idle" | "listening" | "processing" | "error";

// Tipo de cada transacción individual detectada por processMultiVoiceInput
export type PendingTransaction = Extract<
  MultiVoiceResult,
  { multiple: true }
>["transactions"][number];

// Transacción manual ingresada desde active-expense mientras se revisa un batch
export type ManualAddItem = {
  amount: number; // siempre positivo
  description: string;
  categoryEmoji: string;
  categoryName: string;
  isExpense: boolean;
  paymentMethod: string;
  /** ISO. Solo lo usa el flujo notification-edit, para no perder la fecha real
   * detectada de la notificación bancaria al editar el ítem antes de guardar. */
  date?: string;
};

interface VoiceState {
  status: VoiceStatus;
  transcript: string;
  finalTranscript: string;
  errorMessage: string | null;
  pendingBatch: PendingTransaction[] | null;
  pendingManualItem: ManualAddItem | null; // registro manual pendiente de agregar al batch

  setStatus: (s: VoiceStatus) => void;
  setTranscript: (t: string) => void;
  setFinalTranscript: (t: string) => void;
  setError: (msg: string | null) => void;
  setPendingBatch: (items: PendingTransaction[]) => void;
  clearPendingBatch: () => void;
  setPendingManualItem: (item: ManualAddItem) => void;
  clearPendingManualItem: () => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  status: "idle",
  transcript: "",
  finalTranscript: "",
  errorMessage: null,
  pendingBatch: null,
  pendingManualItem: null,

  setStatus: (status) => set({ status }),
  setTranscript: (transcript) => set({ transcript }),
  setFinalTranscript: (finalTranscript) => set({ finalTranscript }),
  setError: (errorMessage) => set({ errorMessage, status: "error" }),
  setPendingBatch: (pendingBatch) => set({ pendingBatch }),
  clearPendingBatch: () => set({ pendingBatch: null }),
  setPendingManualItem: (pendingManualItem) => set({ pendingManualItem }),
  clearPendingManualItem: () => set({ pendingManualItem: null }),
  reset: () =>
    set({
      status: "idle",
      transcript: "",
      finalTranscript: "",
      errorMessage: null,
      pendingBatch: null,
      pendingManualItem: null,
    }),
}));
