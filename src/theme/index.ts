// ─── Sistema de colores para tema claro/oscuro ────────────────────────────────

export type AppTheme = {
  isDark:       boolean;
  bg:           string;   // fondo de pantallas
  surface:      string;   // tarjetas / modales
  border:       string;   // separadores / bordes
  text:         string;   // texto principal
  textSub:      string;   // texto secundario
  textTertiary: string;   // texto muy suave (labels)
  itemBg:       string;   // fondo de item de transacción
  pillNeutral:  string;   // fondo de pill no seleccionado
  inputBg:      string;   // fondo de inputs y botones icono
  accent:       string;   // color de acento / primario
  statusBar:    "dark-content" | "light-content";
};

export const light: AppTheme = {
  isDark:       false,
  bg:           "#F2F2F4",
  surface:      "#FFFFFF",
  border:       "#E2E8F0",
  text:         "#0F172A",
  textSub:      "#64748B",
  textTertiary: "#9CA3AF",
  itemBg:       "#F2F2F4",
  pillNeutral:  "#EBEBED",
  inputBg:      "#F1F5F9",
  accent:       "#135BEC",
  statusBar:    "dark-content",
};

export const dark: AppTheme = {
  isDark:       true,
  bg:           "#0D1117",
  surface:      "#161B22",
  border:       "#30363D",
  text:         "#E6EDF3",
  textSub:      "#8B949E",
  textTertiary: "#6E7681",
  itemBg:       "#21262D",
  pillNeutral:  "#21262D",
  inputBg:      "#30363D",
  accent:       "#4B82EF",
  statusBar:    "light-content",
};
