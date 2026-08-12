// ─── Capa de tokens aditiva (tipografía, spacing, radius, motion, color anidado) ──
// No reemplaza `AppTheme` (src/theme/index.ts) — conviven. Los componentes nuevos
// (Card, ListRow, StackedScreenHeader…) consumen esto vía useAppTokens(); el resto
// de la app sigue usando useTheme()/AppTheme sin cambios hasta que se migre aparte.
import { Platform } from "react-native";
import { useTheme } from "@/src/context/ThemeContext";

// ─── Tipografía ─────────────────────────────────────────────────────────────────

const systemFont = Platform.select({ ios: "System", android: "sans-serif", default: "System" });

export const typography = {
  largeTitle: {
    fontFamily: systemFont,
    fontSize: 34,
    fontWeight: "700" as const,
    letterSpacing: -0.7,
    lineHeight: 40,
  },
  headline: {
    fontFamily: systemFont,
    fontSize: 17,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  body: {
    fontFamily: systemFont,
    fontSize: 17,
    fontWeight: "400" as const,
    letterSpacing: 0,
    lineHeight: 24,
  },
  subheadline: {
    fontFamily: systemFont,
    fontSize: 15,
    fontWeight: "400" as const,
    letterSpacing: 0,
    lineHeight: 20,
  },
  footnote: {
    fontFamily: systemFont,
    fontSize: 13,
    fontWeight: "400" as const,
    letterSpacing: 0.1,
    lineHeight: 18,
  },
  sectionHeader: {
    fontFamily: systemFont,
    fontSize: 13,
    fontWeight: "600" as const,
    letterSpacing: 0.5,
    lineHeight: 18,
  },
} as const;

export type TypeRole = keyof typeof typography;

// ─── Spacing y radios ───────────────────────────────────────────────────────────

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export type SpacingToken = keyof typeof spacing;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 } as const;

// ─── Movimiento ─────────────────────────────────────────────────────────────────

export const spring = {
  default: { dampingRatio: 1, duration: 400 },
  // Feedback de presión (PressableScale) — 100-160ms es el rango recomendado
  // para este tipo de microinteracción (review-animations/STANDARDS.md).
  snappy: { dampingRatio: 1, duration: 140 },
} as const;

export const pressScale = 0.97;

// ─── Color anidado (light/dark) ────────────────────────────────────────────────
// Reutiliza el acento existente de la app (#135BEC / #4B82EF) en vez de inventar
// uno nuevo — regla inmutable #8 de AGENTS.md (botón primario fijo #135BEC).

export const tokenColors = {
  light: {
    surface: { primary: "#F2F2F4", secondary: "#FFFFFF", elevated: "#F1F5F9" },
    text: { primary: "#0F172A", secondary: "#64748B", accent: "#135BEC" },
    border: { default: "#E2E8F0" },
    accent: { default: "#135BEC", subtle: "#135BEC1A" },
    state: { success: "#059669", warning: "#D97706", danger: "#DC2626", dangerSubtle: "#FEE2E2" },
  },
  dark: {
    surface: { primary: "#000000", secondary: "#1C1C1F", elevated: "#2A2A2E" },
    text: { primary: "#E6EDF3", secondary: "#8B949E", accent: "#4B82EF" },
    border: { default: "#30363D" },
    accent: { default: "#4B82EF", subtle: "#4B82EF26" },
    state: { success: "#22C55E", warning: "#F59E0B", danger: "#F87171", dangerSubtle: "#3A1B1D" },
  },
} as const;

export type TokenColors = (typeof tokenColors)["light"];

// ─── Hook de acceso ─────────────────────────────────────────────────────────────
// Reutiliza el esquema ya resuelto por AppTheme (dark mode manual + sistema,
// resuelto en app/_layout.tsx) en vez de leer useColorScheme() por separado.

export function useAppTokens() {
  const theme = useTheme();
  return {
    colors: tokenColors[theme.isDark ? "dark" : "light"],
    typography,
    spacing,
    radius,
    motion: { spring, pressScale },
  };
}
