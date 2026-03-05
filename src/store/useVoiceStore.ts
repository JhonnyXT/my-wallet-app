import { create } from "zustand";

export type VoiceStatus = "idle" | "listening" | "processing" | "error";

interface VoiceState {
  status: VoiceStatus;
  transcript: string;       // texto parcial en tiempo real
  finalTranscript: string;  // texto final corregido por el engine
  errorMessage: string | null;

  setStatus: (s: VoiceStatus) => void;
  setTranscript: (t: string) => void;
  setFinalTranscript: (t: string) => void;
  setError: (msg: string | null) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  status: "idle",
  transcript: "",
  finalTranscript: "",
  errorMessage: null,

  setStatus: (status) => set({ status }),
  setTranscript: (transcript) => set({ transcript }),
  setFinalTranscript: (finalTranscript) => set({ finalTranscript }),
  setError: (errorMessage) => set({ errorMessage, status: "error" }),
  reset: () =>
    set({
      status: "idle",
      transcript: "",
      finalTranscript: "",
      errorMessage: null,
    }),
}));
