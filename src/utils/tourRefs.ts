import { createRef, type RefObject } from "react";
import { type View } from "react-native";

const registry = new Map<string, RefObject<View>>();

export function getTourRef(key: string): RefObject<View> {
  if (!registry.has(key)) registry.set(key, createRef<View>());
  return registry.get(key)!;
}

export const TOUR_KEYS = {
  SETTINGS_BTN: "settings-btn",
  INCOME_ROW: "income-row",
  BACK_BTN: "back-btn",
  MIC_FAB: "mic-fab",
  PLUS_BTN: "plus-btn",
} as const;
